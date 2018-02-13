/**
 * Reference implementation of a client for the M-SALT API.
 *
 * @module client
 * @author Marcello Perathoner
 */

import $ from 'jquery';
import _ from 'lodash';
import Vue from 'vue';
import popper from 'popper.js';
import bs from 'bootstrap';
import sanitizeHtml from 'sanitize-html';
import Sanscript from 'sanscript';

import 'client-css';

const DNDTypeHeadword = 'text/x-msalt-headword';

const APIS = [
    { 'id': 'cpd',  'url': 'http://api.cpd.uni-koeln.de/v1/' },
    { 'id': 'cpd2', 'url': 'http://api.cpd.uni-koeln.de/v1/' },
    { 'id': 'cpd3', 'url': 'http://api.cpd.uni-koeln.de/v1/' },
];

const API = {
    'name':       '',
    'short_name': '',
    'css':        null,
    'css_url':    null,
    't13n_query': ['iso'],
}

// add aliases for t13n schemes
Sanscript.addBrahmicScheme ('deva', Sanscript.schemes.devanagari);
Sanscript.addRomanScheme   ('iso', Sanscript.schemes.iast);

// when transliterating a query param we try these in order until we find one
// supported by the server
const preferred_query_t13n = ['deva', 'iso', 'iast', 'slp1', 'hk', 'velthus', 'wx', 'itrans'];

/**
 * Make CSS scoped.
 *
 * Since we insert snippets from external sources into our DOM, we must take
 * care that any externally supplied CSS does not apply to our DOM.  This
 * function transforms the input CSS so that it only applies below @a root.
 *
 * @function scope_css
 *
 * @param {string} src_css - The CSS to transform.
 * @param {string} root - The selector of the root element.
 *
 * @returns {string} The transformed CSS.
 */

function scope_css (src_css, root) {
    // edit the css so that it only applies to children of 'root'
    let doc = document.implementation.createHTMLDocument ("");
    let style = document.createElement ("style");
    style.textContent = src_css;
    // the style will only be parsed once it is added to a document
    doc.body.appendChild (style);

    let dest_css = [];
    for (let rule of style.sheet.cssRules) {
        dest_css.push (`${root} ${rule.selectorText} {${rule.style.cssText}}`);
    }
    return dest_css.join ('\n');
}

function get_closest ($target, data_attr) {
    return $target.closest ('[data-' + data_attr + ']').attr ('data-' + data_attr);
}

function drag_headword (event, headword) {
    event.originalEvent.dataTransfer.setData (DNDTypeHeadword, JSON.stringify ({
        'headword' : headword,
        't13n' : get_closest ($ (event.target), 't13n'),
    }));
    $ ('#search').css ({ 'background-color' : '#ff0' })
    setTimeout (function () {
        $ ('#search').css ({ 'background-color' : '#fff' })
    }, 500);
}

$ (document).ready (function () {
    var app = new Vue ({
        el: '#app',
        data: {
            apis: [],
            apis_dict: {},
            active_apis: ['cpd', 'cpd2'],
            search_results: [],
            q: 'ahimsa',
            article: '',
            canonical_url: '',
            context: [],
            current_api: null,
            current_article: null,
            current_article_url: '', // actually the endpoint url
            t13n: 'iso',
            // when displaying an article we prefer these t13ns in order
            preferred_view_t13n: ['iso', 'slp1', 'hk', 'deva'],
        },
        computed: {
            transliterated: function () {
                return Sanscript.t (this.q, this.t13n, 'deva');
            }
        },
        methods: {
            sanitize_headword: function (html) {
                return sanitizeHtml (html, {
                    allowedTags: [ 'i', 'sup', 'sub' ],
                    allowedAttributes: {
                        '*' : [], // no class attribute because we don't have
                                  // any custom CSS here
                    },
                });
            },
            sanitize_article: function (html) {
                return sanitizeHtml (html, {
                    allowedTags: [ 'div', 'p', 'span', 'i', 'b', 'em', 'strong', 'sup', 'sub', 'br' ],
                    allowedAttributes: {
                        '*' : ['class'],
                    },
                });
            },
            do_t13n : function (event) {
                app.t13n = $ (event.target).text ();
            },
            get_preferred_view_t13n : function (json) {
                for (let t13n of app.preferred_view_t13n) {
                    for (let a of json) {
                        if (a.mimetype == 'text/x-html-literal' && a.embeddable && a.t13n === t13n)
                            return a;
                    }
                }
                return json.article[0];
            },
            get_canonical_url : function (json) {
                for (let a of json) {
                    if (a.canonical)
                        return a.url;
                }
                return null;
            },
            clear_article : function () {
                $ ('#article').html ('');
                $ ('style.api-style').remove ();
                app.current_api = null;
                app.current_article = null;
                app.canonical_url = '';
                app.context.length = 0;
                app.current_article_url = '';
            },
            do_search: function (event) {
                app.clear_article ();
                app.search_results.length = 0; // clear
                app.context.length = 0;
                app.current_api = null;
                app.current_article = null;
                app.current_article_url = '';
                for (let id of this.active_apis) {
                    let api = app.apis_dict[id];
                    let q = '';
                    let t13n = '';
                    for (let scheme of preferred_query_t13n) {
                        if (api.t13n_query.includes (scheme)) {
                            if (scheme === 'deva') {
                                q = this.transliterated;
                            } else {
                                q = Sanscript.t (this.transliterated, 'deva', scheme);
                            }
                            t13n = scheme;
                            break;
                        }
                    }
                    if (q !== '') {
                        let url = api.url + 'headwords/?' + $.param ({ 'q' : q, 't13n' : t13n });
                        $.getJSON (url, (json) => {
                            json.dict_id = id;
                            json.name = api.name;
                            json.short_name = api.short_name;
                            app.search_results.push (json);
                        });
                    } else {
                        // FIXME: insert some kind of error message
                    }
                }
            },
            do_article: function (event) {
                app.clear_article ();
                let $target = $ (event.currentTarget);
                let dict_id      = get_closest ($target, 'dictionary-id');
                let article_url  = get_closest ($target, 'article-url');
                let headword_url = get_closest ($target, 'headword-url');
                let api = app.apis_dict[dict_id];
                let url         = api.url + article_url;
                let context_url = api.url + headword_url + '/context/'

                app.current_api = api;

                $.get (url, (json) => {
                    if (api.css) {
                        $ ('head').append (
                            '<style type="text/css" class="api-style">' + app.css + '</style>'
                        );
                    }
                    app.current_article = app.get_preferred_view_t13n (json);
                    $ ('#article').html (app.sanitize_article (app.current_article.text));
                    app.current_article_url = article_url;
                    app.canonical_url = app.get_canonical_url (json);
                });
                $.getJSON (context_url, (json) => {
                    app.context = json;
                });
            },
        },
    });

    // fill in missing information in apis from '/' endpoints of all dictionaries
    // make the attributes known to vue.js early, or they won't be instrumented
    for (let api of APIS) {
        $.getJSON (api.url, (json) => {
            Object.assign (api, API, _.pick (json, ['name', 'short_name', 'css_url', 'css', 't13n_query' ]))
            if (api.css !== '') {
                api.css = scope_css (api.css, '#article');
            }
            if (api.css_url !== '') {
                $.get (api.css_url, (css) => {
                    api.css = scope_css (css, '#article');
                });
            }
            app.apis.push (api);
            app.apis_dict[api.id] = api;
        });
    }

    $ (document).on ('dragstart', '.headword', function (event) {
        drag_headword (event, $ (event.target).text ());
    });
    $ (document).on ('dragstart', '#article', function (event) {
        drag_headword (event, window.getSelection ().toString ());
    });

    $ ('#search').on ('drop', function (event) {
        event.stopPropagation ();
        event.preventDefault ();
        let data = JSON.parse (event.originalEvent.dataTransfer.getData (DNDTypeHeadword));
        app.q = data.headword;
        app.t13n = data.t13n;
        app.do_search (event);
    }).on ('dragover', function (event) {
        event.originalEvent.dataTransfer.dropEffect = 'move';
        event.preventDefault ();
    }).on ('dragenter', function (event) {
        event.preventDefault ();
    });
});
