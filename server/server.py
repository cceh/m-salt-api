#!/usr/bin/python3
# -*- encoding: utf-8 -*-

"""An API for the Critical Pāli Dictionary"""

import argparse
import collections
import configparser
import datetime
import functools
import glob
import io
import itertools
import json
import logging
import math
import operator
import re
import sys
import os
import os.path
import urllib.parse

import flask
import sqlalchemy
import flask_sqlalchemy
from flask import request, current_app
from sqlalchemy.sql import text

from werkzeug.routing import Map, Rule

re_integer_arg = re.compile (r'^[0-9]+$');
re_normalize_headword = re.compile (r'^[-\[\(√°~]*(?:<sup>\d+</sup>)?(.*?)[-°~\)\]]*$');

class MySQLEngine (object):
    """ Database Interface """

    def __init__ (self, **kwargs):

        args = self.get_connection_params (kwargs)

        self.url = 'mysql+pymysql://{user}:{password}@{host}:{port}/{database}'.format (**args)
        logger.log (logging.INFO,
                     'MySQLEngine: Connecting to mysql+pymysql://{user}:password@{host}:{port}/{database}'.format (**args))
        self.engine = sqlalchemy.create_engine (self.url + '?charset=utf8mb4&sql_mode=ANSI',
                                                pool_recycle = 300)


    def get_connection_params (self, kwargs = {}):
        """ Get connection parameters from .my.cnf file. """

        config = configparser.ConfigParser ()

        if 'MYSQL_CONF' in kwargs:
            config.read (('/etc/my.cnf', os.path.expanduser (kwargs['MYSQL_CONF'])))
        else:
            config.read (('/etc/my.cnf', os.path.expanduser ('~/.my.cnf')))

        section = config[kwargs.get ('MYSQL_GROUP', 'mysql')]
        from_my_cnf = {
            'host' :     section.get ('host',     'localhost').strip ('"'),
            'port' :     section.get ('port',     '3306').strip ('"'),
            'database' : section.get ('database', '').strip ('"'),
            'user' :     section.get ('user',     '').strip ('"'),
            'password' : section.get ('password', '').strip ('"'),
        }

        return from_my_cnf


def execute (conn, sql, parameters, debug_level = logging.DEBUG):
    start_time = datetime.datetime.now ()
    result = conn.execute (text (sql.strip ()), parameters)
    logger.log (debug_level, '%d rows in %.3fs',
                result.rowcount, (datetime.datetime.now () - start_time).total_seconds ())
    return result


def clip (i, min_, max_):
    return max (min (int (i), max_), min_)


def arg (name, default, re, msg = None):
    arg = request.args.get (name, default)
    if not re.match (arg):
        if msg is None:
            msg = 'Invalid %s parameter' % name
        flask.abort (msg)
    return arg


def make_headword (row, t13n):
    m = re_normalize_headword.match (row[1])
    return {
        'url' : 'headwords/%d' % row[0],
        'text' : row[1],
        'normalized_text' : m.group (1).lower () if m else '', # iso has no uppercase
        'article_url' : 'articles/%d' % row[2],
        't13n' : t13n
    }


def make_html_response (obj):
    resp = flask.Response (obj, mimetype='text/html; charset=utf-8')
    resp.headers['Access-Control-Allow-Origin'] = '*'
    return resp


def make_json_response (obj):
    resp = flask.Response (json.dumps (obj, indent=2, sort_keys=True), mimetype='application/json')
    resp.headers['Access-Control-Allow-Origin'] = '*'
    return resp


def make_headword_response (row, t13n = 'iso'):
    return make_json_response (make_headword (row, t13n));


def make_headwords_response (res, t13n = 'iso'):
    return make_json_response ([ make_headword (row, t13n) for row in res ]);


def wordlist (offset, limit):
    """ Retrieve a list of headwords. """

    with current_app.config.dba.engine.begin () as conn:
        res = execute (conn, r"""
        SELECT id, webkeyword, no
        FROM keyword
        ORDER BY sortkeyword
        LIMIT :limit
        OFFSET :offset
        """, { 'offset' : offset, 'limit' : limit })

        return make_headwords_response (res)


# need this before first @app.endpoint declaration
app = flask.Flask (__name__)

@app.endpoint ('info')
def info ():
    """ Endpoint.  The root of the application. """

    info = {
        'name'          : app.config['APPLICATION_NAME'],
        'short_name'    : app.config['APPLICATION_SHORT_NAME'],
        'main_page_url' : app.config['APPLICATION_MAIN_URL'],
        'css_url'       : app.config.get ('APPLICATION_CSS_URL', ''),
        'css'           : 'span.smalltext { font-size: smaller }',
        'supported_t13ns_query' : [ 'iso' ],
    }
    return make_json_response (info)


@app.endpoint ('articles')
def articles (_id):
    """ Endpoint.  Retrieve a dictionary article by ID. """

    canonical_url = app.config['APPLICATION_MAIN_URL'] + 'search?article_id='

    with current_app.config.dba.engine.begin () as conn:
        res = execute (conn, r"""
        SELECT webtext FROM article WHERE no=:no
        """, { 'no' : _id })
        return make_json_response ([
            {
                'mimetype' : 'text/x-html-literal',
                't13n' : 'iso',
                'embeddable' : True,
                'text' : '<div>%s</div>' % res.fetchone ()[0],
            },
            {
                'mimetype' : 'text/html',
                't13n' : 'iso',
                'canonical' : True,
                'urls' : [ canonical_url + str (_id) ],
            }
        ])


@app.endpoint ('headwords')
def headwords ():
    """ Endpoint.  Retrieve a list of headword IDs.

    This implements the search query and wordlist.

    """

    q          = request.args.get ('q')
    offset     = int (arg ('offset', '0', re_integer_arg))
    limit      = clip (arg ('limit', '100', re_integer_arg), 1, 100)

    if not q:
        return wordlist (offset, limit)

    q = q.replace ('-', '')
    q = q.replace ('%', '')
    q = q.replace ('?', '_')
    q = q.replace ('*', '%')

    with current_app.config.dba.engine.begin () as conn:
        res = execute (conn, r"""
        SELECT id, webkeyword, no
        FROM keyword
        WHERE keyword LIKE :q
        ORDER BY sortkeyword
        LIMIT :limit
        OFFSET :offset
        """, { 'q' : q, 'offset' : offset, 'limit' : limit })

        return make_headwords_response (res)


@app.endpoint ('headword')
def headword (_id):
    """ Retrieve a headword. """

    with current_app.config.dba.engine.begin () as conn:
        res = execute (conn, """
        SELECT id, webkeyword, no
        FROM keyword
        WHERE id = :id
        """, { 'id' : _id })

        return make_headword_response (res.fetchone ())


@app.endpoint ('context')
def context (_id):
    """ Retrieve a list of headwords around a given headword. """

    limit = clip (arg ('limit', '10', re_integer_arg), 1, 100)

    with current_app.config.dba.engine.begin () as conn:
        res = execute (conn, """
        SELECT keyword, sortkeyword
        FROM keyword
        WHERE id = :id
        """, { 'id' : _id })
        keyword, sortkeyword = res.fetchone ()

        res1 = execute (conn, """
        SELECT id, webkeyword, no
        FROM keyword
        WHERE sortkeyword < :sortkeyword
        ORDER BY sortkeyword DESC
        LIMIT :limit
        """, { 'sortkeyword' : sortkeyword, 'limit' : limit })

        res2 = execute (conn, """
        SELECT id, webkeyword, no
        FROM keyword
        WHERE sortkeyword >= :sortkeyword
        ORDER BY sortkeyword
        LIMIT :limit
        """, { 'sortkeyword' : sortkeyword, 'limit' : limit + 1 })

        res = []

        for row in reversed (res1.fetchall ()):
            res.append (row[:3])
        for row in res2:
            res.append (row[:3])

        return make_headwords_response (res)


#
# main
#

parser = argparse.ArgumentParser (description='A simple API for dictionares')

parser.add_argument ('-v', '--verbose', dest='verbose', action='count',
                     help='increase output verbosity', default=0)
parser.add_argument ('-c', '--config-file', dest='config_file', action='append',
                     required=True, metavar='CONFIG_FILE',
                     help="a config file (repeat for more than one, later ones overwrite)")

args = parser.parse_args ()
args.start_time = datetime.datetime.now ()
LOG_LEVELS = { 0: logging.CRITICAL, 1: logging.ERROR, 2: logging.WARN, 3: logging.INFO, 4: logging.DEBUG }
args.log_level = LOG_LEVELS.get (args.verbose + 1, logging.CRITICAL)

logging.basicConfig (format = '%(asctime)s - %(levelname)s - %(message)s')
logging.getLogger ('sqlalchemy.engine').setLevel (args.log_level)
logging.getLogger ('server').setLevel (args.log_level)

logger = logging.getLogger ('server')

for config_file in args.config_file:
    app.config.from_pyfile (config_file)

app.config.dba = MySQLEngine (**app.config)
app.config['SQLALCHEMY_DATABASE_URI'] = app.config.dba.url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['server_start_time'] = str (int (args.start_time.timestamp ()))

app.url_map = Map ([
    Rule ('/v1/',                             endpoint = 'info'),
    Rule ('/v1/headwords/',                   endpoint = 'headwords'),
    Rule ('/v1/headwords/<int:_id>',          endpoint = 'headword'),
    Rule ('/v1/headwords/<int:_id>/context/', endpoint = 'context'),
    Rule ('/v1/articles/<int:_id>',           endpoint = 'articles'),
])

dba = flask_sqlalchemy.SQLAlchemy ()
dba.init_app (app)

port = app.config.get ('APPLICATION_PORT', 5000)
path = app.config.get ('APPLICATION_ROOT', '/')

logger.log (logging.INFO, "'{name}' is now served from port {port}{path}".format (
    name = app.config['APPLICATION_NAME'],
    port = port,
    path = path))


if __name__ == "__main__":
    from werkzeug.serving import run_simple
    run_simple ('localhost', port, app)
