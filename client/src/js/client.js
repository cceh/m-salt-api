/**
 * Reference implementation of a client for the M-SALT API.
 *
 * @module client
 * @author Marcello Perathoner
 */

/*
 * TODO:
 *
 * implement history with hashtag
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
    'supported_langs_query': ['iso'],  // sic!
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

            results: [], // results of the current query
                           // array of (array of headwords)

            article_formats: [],     // list of available article formats
            article_endpoint: null,  // the endpoint url that gave us the list
            article: null,           // the preferred (displayed) article format

            headwords: null, // headwords of chosen article, object

            context: null, // context of chosen headword, array of headwords

            // the t13n schemes we support in the order they should appear in the
            // dropdown menu
            supported_lang: [
                { 'id' : 'deva',   'desc' : 'Devanagari' },
                { 'id' : 'iso',    'desc' : 'ISO 15919' },
                { 'id' : 'iast',   'desc' : 'IAST' },
                { 'id' : 'slp1',   'desc' : 'SLP1' },
                { 'id' : 'hk',     'desc' : 'Harvard-Kyoto' },
                { 'id' : 'vh',     'desc' : 'Velthuis' },
                { 'id' : 'wx',     'desc' : 'WX notation' },
                { 'id' : 'itrans', 'desc' : 'ITRANS' },
            ],

            // model of the user controls
            // with some defaults filled in for easier testing
            user: {
                active_apis: ['cpd', 'cpd2'],
                fulltext: false,
                query: '',
                query_lang: 'iso',
                article_lang: 'iso',
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
                return st.xlate (this.user.query, this.user.query_lang, 'deva');
            },
            article_t13n: function () {
                if (this.article) {
                    let from = st.get_t13n (this.article.lang);
                    let to = this.user.article_lang;
                    let $html = $(this.article.text);
                    // FIXME: make this configurable
                    $html.find ('b').each (function (index, elem) {
                        st.xlate_text_nodes (elem, from, to);
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
                this.headwords = null;
                this.context = null;
            },
            clear_search : function () {
                this.results = [];
            },
            on_search: function (event) {
                this.clear_search ();
                for (let id of this.user.active_apis) {
                    let api = this.get_api (id);
                    let q = '';
                    let preferred_lang = '';
                    if (api.supported_langs_query.includes (this.user.query_lang)) {
                        // the current t13n is supported by the server, use it
                        q = this.user.query;
                        preferred_lang = this.user.query_lang;
                    } else {
                        // use the best t13n that is supported by the server
                        for (let scheme of api.supported_langs_query) {
                            if (api.supported_langs_query.includes (scheme)) {
                                q = st.xlate (this.user.query, this.user.query_lang, scheme);
                                preferred_lang = scheme;
                                break;
                            }
                        }
                    }
                    if (q !== '') {
                        let params = { 'lang' : preferred_lang };
                        params[this.user.fulltext ? 'fulltext' : 'q'] = q;
                        let url = api.url + 'headwords/?' + $.param (params);
                        $.getJSON (url, (json) => {
                            this.results.push ({
                                'dict_id' : id,
                                'name' : api.name,
                                'short_name' : api.short_name,
                                'headwords' : json,
                            });
                        });
                    } else {
                        // FIXME: insert some kind of error message
                    }
                }
            },
            on_article: function (headword) {
                this.clear_article ();
                window.location.hash = '#' + $.param (
                    _.pick (headword, ['articles_url', 'headwords_url', 'dictionary_id'])
                );
            },
            on_hashchange: function (hash) {
                try {
                    const data = st.deparam (hash);
                    this.clear_article ();

                    this.api = this.get_api (data.dictionary_id);

                    $.get (this.api.url + data.articles_url + '/formats/', (json) => {
                        this.article_formats = json;
                        let article = this.get_preferred_doc (json);
                        article.text = this.sanitize_article (article.text);
                        this.article = article;
                        this.article_endpoint = data.articles_url;
                    });
                    $.getJSON (this.api.url + data.articles_url + '/headwords/', (json) => {
                        this.headwords = [
                            {
                                dict_id: data.dictionary_id,
                                short_name: 'Headwords',
                                headwords : json,
                            }
                        ];
                    });
                    $.getJSON (this.api.url + data.headwords_url + '/context/', (json) => {
                        this.context = [
                            {
                                dict_id: data.dictionary_id,
                                short_name: 'Context',
                                headwords : json,
                            }
                        ];
                    });
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
            $.getJSON (api.url, (json) => {
                Object.assign (api, API); // assign defaults
                for (const key in json) {
                    const value = json[key];
                    if (key === 'supported_langs_query') {
                        api.supported_langs_query = value.map (st.get_t13n);
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
                app.apis.push (api);
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
        event.originalEvent.dataTransfer.setData (DNDTypeHeadword, JSON.stringify ({
            'normalized_text' : window.getSelection ().toString (),
            'lang' : st.get_closest ($(event.currentTarget), 'lang'),
        }));
        st.flash_input ();
    });

    // make headwords droppable on the search box

    $ ('#search').on ('drop', function (event) {
        event.stopPropagation ();
        event.preventDefault ();
        let headword = JSON.parse (event.originalEvent.dataTransfer.getData (DNDTypeHeadword));
        app.user.query = st.xlate (
            headword.normalized_text, st.get_t13n (headword.lang), app.user.query_lang);
        app.on_search (event);
    }).on ('dragover', function (event) {
        event.originalEvent.dataTransfer.dropEffect = 'move';
        event.preventDefault ();
    }).on ('dragenter', function (event) {
        event.preventDefault ();
    });
});
