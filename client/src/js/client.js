/**
 * Reference implementation of a client for the M-SALT API.
 *
 * @module client
 * @author Marcello Perathoner
 */

/*
 * TODO:
 *
 */

import $ from 'jquery';
import _ from 'lodash';
import Vue from 'vue';
import popper from 'popper.js';
import bs from 'bootstrap';
import sanitize_html from 'sanitize-html';
import st from './salt-tools';
import salt_headwords from './salt-headwords.vue';
import * as cookies from 'tiny-cookie';

import 'client-css';

const DNDTypeHeadword = 'text/x-msalt-headword';

const API = { // defaults for apis
    'name':          '',
    'short_name':    '',
    'main_page_url': '',
    'css':           '',
    'supported_langs_query': [ 'x-iso' ],
    'current_url':   '',
}

// Register a global custom directive called `v-focus`
Vue.directive ('focus', {
  // When the bound element is inserted into the DOM...
  inserted: function (el) {
    // Focus the element
    el.focus ()
  }
})

$ (document).ready (function () {
    window.location.hash = '';

    var app = new Vue ({
        el: '#app',
        components: {
            'salt-headwords': salt_headwords,
        },
        data: {
            apis: [],  // all known APIs
            api: null, // the API of the currently displayed article

            article_formats: [],     // list of available article formats
            article_endpoint: null,  // the endpoint url that gave us the list
            article: null,           // the preferred (displayed) article format

            headwords: { // headwords of chosen article, object
                dict_id: '',
                short_name: 'Headwords',
                current_url: '',
            },

            context: {  // context of chosen headword
                dict_id: '',
                short_name: 'Context',
                current_url: '',
            },

            // the t13n schemes we support in the order they should appear in the
            // dropdown menu
            supported_langs: [
                { 'id' : 'x-deva',     'desc' : 'deva', 'longdesc' : 'Devanagari' },
                { 'id' : 'x-iso',      'desc' : 'iso',  'longdesc' : 'ISO 15919' },
                { 'id' : 'x-iast',     'desc' : 'iast', 'longdesc' : 'IAST' },
                { 'id' : 'x-slp1',     'desc' : 'slp1', 'longdesc' : 'SLP1' },
                { 'id' : 'x-hk',       'desc' : 'hk',   'longdesc' : 'Harvard-Kyoto' },
                { 'id' : 'x-velthuis', 'desc' : 'vh',   'longdesc' : 'Velthuis' },
                { 'id' : 'x-wx',       'desc' : 'wx',   'longdesc' : 'WX notation' },
                { 'id' : 'x-itrans',   'desc' : 'itra', 'longdesc' : 'ITRANS' },
            ],

            // model of the user controls
            // with some defaults filled in for easier testing
            user: {
                active_apis: ['cpd', 'cpd2'],
                query: '',
                query_lang: 'x-iso',
                article_lang: 'x-iso',
            },
        },
        watch: {
            'api.css' : function (new_value) {
                // Because <head> is out-of-bounds for vue.js we have to change
                // this manually.
                $ ('#api-style').text (new_value);
            },
            'user' : {
                handler: function (new_value) {
                    cookies.set ('user_prefs', JSON.stringify (new_value), 30);
                },
                deep: true,
            },
        },
        computed: {
            user_query_in_deva: function () {
                return st.xlate (this.user.query, this.user.query_lang, 'x-deva');
            },
            article_t13n: function () {
                if (this.article) {
                    let from = this.article.lang;
                    let to = this.user.article_lang;
                    if (!st.need_t13n (from, to))
                        return this.article.text;
                    let $html = $(this.article.text);
                    // FIXME: make this configurable
                    $html.find ('b').each (function (index, elem) {
                        st.xlate_dom (elem, from, to);
                        $ (elem).attr ('data-script', to);
                    });
                    return $html.html ();
                }
                return '';
            },
            canonical_url : function () {
                for (let a of this.article_formats) {
                    if (a.canonical)
                        return a.urls[0];
                }
                return null;
            },
        },
        methods: {
            sanitize_article: function (html) {
                return sanitize_html (html, {
                    allowedTags: [ 'div', 'p', 'span', 'i', 'b', 'em', 'strong', 'sup', 'sub', 'br' ],
                    allowedAttributes: {
                        '*' : ['class'],
                    },
                });
            },
            on_user_query_lang : function (event) {
                let from = this.user.query_lang;
                let to = $ (event.target).attr ('data-lang'); // attr on button
                this.user.query = st.xlate (this.user.query, from, to);
                this.user.query_lang = to;
            },
            on_user_article_lang : function (event) {
                this.user.article_lang = $ (event.target).attr ('data-lang'); // attr on button
            },
            lang_to_desc : function (lang) {
                let l = this.supported_langs.filter (x => x.id === lang);
                if (l.length)
                    return l[0].desc;
                return 'und'
            },
            get_api : function (id) {
                for (let api of this.apis) {
                    if (api.id === id)
                        return api;
                }
                return null;
            },
            get_preferred_doc : function (json) {
                for (let a of json) {
                    if (a.mimetype == 'text/x-html-literal' && a.embeddable)
                        return a;
                }
                // FIXME: implement retrieval of referenced doc
                return json[0];
            },
            clear_article : function () {
                this.api = null;
                this.article = null;
                this.article_formats = [];
                this.article_endpoint = '';
                this.headwords.current_url = '';
                this.context.current_url = '';
            },
            on_search: function (event) {
                this.do_search (event, 'q');
            },
            on_fulltext_search: function (event) {
                this.do_search (event, 'fulltext');
            },
            do_search: function (event, fulltext) {
                for (let api of this.apis) {
                    api.current_url = '';
                }
                for (let id of this.user.active_apis) {
                    let api = this.get_api (id);
                    let q = '';
                    let preferred_lang = '';
                    let candidates = api.supported_langs_query.filter (
                        x => !st.need_t13n (x, this.user.query_lang)
                    );
                    if (candidates.length > 0) {
                        // the current t13n is supported by the server, use it
                        preferred_lang = this.user.query_lang;
                        q = this.user.query;
                    } else {
                        // use the first t13n that is supported by the server
                        preferred_lang = api.supported_langs_query[0];
                        q = st.xlate (this.user.query, this.user.query_lang, preferred_lang);
                    }
                    if (q !== '') {
                        let params = { 'lang' : st.get_t13n (preferred_lang) };
                        params[fulltext] = q;
                        api.current_url = api.url + 'v1/headwords?' + $.param (params);
                    } else {
                        // FIXME: insert some kind of error message
                    }
                }
            },
            on_article: function (headword) {
                window.location.hash = '#' + $.param (
                    _.pick (headword, ['articles_url', 'headwords_url', 'dictionary_id'])
                );
            },
            on_hashchange: function (hash) {
                try {
                    const data = st.deparam (hash);
                    this.clear_article ();

                    this.api = this.get_api (data.dictionary_id);

                    $.getJSON (this.api.url + data.articles_url + '/formats', (json) => {
                        this.article_formats = json;
                        let article = this.get_preferred_doc (json);
                        article.text = this.sanitize_article (article.text);
                        this.article = article;
                        this.article_endpoint = data.articles_url;
                    });
                    this.headwords.current_url = this.api.url + data.articles_url + '/headwords';
                    this.context.current_url   = this.api.url + data.headwords_url + '/context?limit=10';
                    this.headwords.id = this.api.id;
                    this.context.id = this.api.id;

                } catch (e) {
                    console.log (e);
                }
            },
        },
    });

    let cookie = cookies.get ('user_prefs');
    if (cookie) {
        Object.assign (app.user, JSON.parse (cookie));
    }

    // implement hashtag navigation
    $ (window).on ('hashchange', () => {
        app.on_hashchange (window.location.hash.substring (1));
    });

    // fill in missing information in apis from '/' endpoints of all dictionaries
    // make the attributes known to vue.js early, or they won't be instrumented
    $.getJSON ('api-list.json', (apis) => {
        for (let api of apis) {
            Object.assign (api, API); // assign defaults
            app.apis.push (api);
            $.getJSON (api.url + 'v1', (json) => {
                for (const key in json) {
                    const value = json[key];
                    if (key === 'supported_langs_query') {
                        api.supported_langs_query = value;
                        continue;
                    }
                    if (typeof value !== 'string')
                        continue;
                    if (key === 'css_url' && value !== '') {
                        $.get (value, (css) => {
                            api.css = st.scope_css (css, '#article');
                        });
                        continue;
                    }
                    if (key === 'css') {
                        api.css = st.scope_css (value, '#article');
                        continue;
                    }
                    api[key] = value;
                }
            });
        }
    });

    // make headwords in headword lists draggable

    $ (document).on ('dragstart', '.headword', function (event) {
        event.originalEvent.dataTransfer.setData (
            DNDTypeHeadword, st.get_closest ($ (event.currentTarget), 'headword')
        );
        st.flash_input ();
    });

    // make selected word in article draggable

    $ (document).on ('dragstart', '#article', function (event) {
        let lang = st.get_closest ($(event.target), 'script');
        if (!lang) {
            lang = st.get_closest ($(event.currentTarget), 'lang');
        }
        event.originalEvent.dataTransfer.setData (DNDTypeHeadword, JSON.stringify ({
            'normalized_text' : window.getSelection ().toString (),
            'lang' : lang,
        }));
        st.flash_input ();
    });

    // make headwords droppable on the search box

    $ ('#search').on ('drop', function (event) {
        event.stopPropagation ();
        event.preventDefault ();
        let headword = JSON.parse (event.originalEvent.dataTransfer.getData (DNDTypeHeadword));
        app.user.query = st.xlate (
            headword.normalized_text, headword.lang, app.user.query_lang);
        app.on_search (event);
    }).on ('dragover', function (event) {
        event.originalEvent.dataTransfer.dropEffect = 'move';
        event.preventDefault ();
    }).on ('dragenter', function (event) {
        event.preventDefault ();
    });
});
