/*!
 * M-SALT API client
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
import { FormCheckbox, FormGroup } from 'bootstrap-vue/es/components';
import vBTooltip from 'bootstrap-vue/es/directives/tooltip/tooltip';

import 'client-css';

const DNDTypeHeadword = 'text/x-msalt-headword';

const API_DEFAULTS = { // defaults for apis
    'id':            '',
    'url':           '',
    'status':        'unknown', // online, busy, offline, unknown
    'selected':      false,
    'short_name':    '',
    'name':          '',
    'main_page_url': '',
    'css':           '',
    'supported_langs_query': [ 'x-iso' ],
    'caption':       '',
    'current_url':   '',
};

// the t13n schemes we support in the order they should appear in the dropdown
// menu
const SUPPORTED_LANGS = [
    { 'id' : 'x-deva',     'desc' : 'deva', 'longdesc' : 'Devanagari' },
    { 'id' : 'x-iso',      'desc' : 'iso',  'longdesc' : 'ISO 15919' },
    { 'id' : 'x-iast',     'desc' : 'iast', 'longdesc' : 'IAST' },
    { 'id' : 'x-slp1',     'desc' : 'slp1', 'longdesc' : 'SLP1' },
    { 'id' : 'x-hk',       'desc' : 'hk',   'longdesc' : 'Harvard-Kyoto' },
    { 'id' : 'x-velthuis', 'desc' : 'vh',   'longdesc' : 'Velthuis' },
    { 'id' : 'x-wx',       'desc' : 'wx',   'longdesc' : 'WX notation' },
    { 'id' : 'x-itrans',   'desc' : 'itra', 'longdesc' : 'ITRANS' },
];

Vue.use (FormCheckbox);
Vue.use (FormGroup);
Vue.directive ('b-tooltip', vBTooltip);

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

    // load user prefs from cookie

    let cookie = cookies.get ('user_prefs');

    var app = new Vue ({
        el: '#app',
        components: {
            'salt-headwords': salt_headwords,
        },
        data: {
            apis: [],  // all known APIs

            article: {           // the currenty displayed article (if any)
                api: null,       // the API of the currently displayed article
                formats: [],     // the list of available article formats
                endpoint: null,  // the endpoint url that gave us the list
                article: null,   // the preferred (displayed) article format
            },

            headwords: { // headwords of chosen article, object
                dict_id: '',
                caption: 'Headwords',
                current_url: '',
                status: 'online',
                selected: false,
            },

            context: {  // context of chosen headword
                dict_id: '',
                caption: 'Context',
                current_url: '',
                status: 'online',
                selected: false,
            },

            supported_langs: SUPPORTED_LANGS,

            // model of the user controls
            user: {
                query: '',
                query_lang: 'x-iso',
                article_lang: 'x-iso',
            },
        },
        watch: {
            'article.api.css' : function (new_value) {
                // Because <head> is out-of-bounds for vue.js we have to change
                // this manually.
                $ ('#api-style').text (new_value);
            },
        },
        computed: {
            user_query_in_deva: function () {
                return st.xlate (this.user.query, this.user.query_lang, 'x-deva');
            },
            selected_apis : function () {
                return this.apis.filter (api => api.selected);
            },
            article_t13n: function () {
                if (this.article.article) {
                    let a = this.article.article;
                    let from = a.lang;
                    let to = this.user.article_lang;
                    if (!st.need_t13n (from, to))
                        return a.text;
                    let $html = $(a.text);
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
                for (let a of this.article.formats) {
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
            set_cookie: function () {
                let cookie = Object.assign ({}, this.user);
                cookie.selected_apis = this.selected_apis.map (api => api.id);
                cookies.set ('user_prefs', JSON.stringify (cookie), 30);
            },
            lang_to_desc : function (lang) {
                let l = this.supported_langs.filter (x => x.id === lang);
                if (l.length)
                    return l[0].desc;
                return 'und';
            },
            get_api : function (id) {
                for (const api of this.apis) {
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
                this.article.api = null;
                this.article.article = null;
                this.article.formats = [];
                this.article.endpoint = '';
                this.headwords.current_url = '';
                this.context.current_url = '';
            },
            on_search: function (event) {
                this.do_search ('q');
            },
            on_fulltext_search: function (event) {
                this.do_search ('fulltext');
            },
            do_search: function (fulltext) {
                for (const api of this.apis) {
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
                        api.current_url = '';
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

                    let api = this.get_api (data.dictionary_id);
                    if (api) {
                        api.status = 'busy';
                        $.getJSON (api.url + data.articles_url + '/formats').done ((json) => {
                            this.article.formats = json;
                            let article = this.get_preferred_doc (json);
                            article.text = this.sanitize_article (article.text);
                            this.article.article = article;
                            this.article.endpoint = data.articles_url;
                            api.status = 'online';
                            this.article.api = api;
                        }).fail ((json) => {
                            api.status = 'offline';
                        });
                        this.headwords.current_url = api.url + data.articles_url + '/headwords';
                        this.context.current_url   = api.url + data.headwords_url + '/context?limit=10';
                        this.headwords.id = api.id;
                        this.context.id = api.id;
                        this.headwords.selected = true;
                        this.context.selected = true;
                    }
                } catch (e) {
                    console.log (e);
                }
            },
            on_api_change: function (api, new_value, old_value) {
                // fill in missing information in apis from '/v1' endpoints of
                // all user-selected dictionaries

                if (new_value) {
                    // ping and enable new APIs
                    api.status = 'busy';
                    $.getJSON (api.url + 'v1').done ((json) => {
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
                        api.status = 'online';
                        // api.selected = true; // last because it triggers search
                    }).fail ((json) => {
                        api.status = 'offline';
                    });
                }
            },
        },
    });

    if (cookie) {
        cookie =  JSON.parse (cookie);
        app.user.query = cookie.query;
        app.user.query_lang = cookie.query_lang;
        app.user.article_lang = cookie.article_lang;
    }
    app.$watch ('user', app.set_cookie, { deep: true });

    // get the list of known servers

    $.getJSON ('api-list.json', (apis) => {
        for (let _api of apis) {
            let api = {};
            Object.assign (api, API_DEFAULTS); // assign defaults
            Object.assign (api, _api);         // assign from api-list
            app.apis.push (api);               // trigger watch
            app.$watch (
                function () {
                    return api.selected;
                },
                function (new_value, old_value) {
                    app.on_api_change (api, new_value, old_value);
                    app.set_cookie ();
                }
            );
            api.selected = cookie && cookie.selected_apis.includes (api.id);
        }
    });

    // implement hashtag navigation

    $ (window).on ('hashchange', () => {
        app.on_hashchange (window.location.hash.substring (1));
    });

    // prevent buttons from taking focus

    $ (document).on ('mousedown', '.prevent-mouse-down',  function (event) {
        event.preventDefault ();
    });

    // prevent click on checkboxes in dropdown to close it

    $(document).on ('click', '.dont-close', function (e) {
        e.stopPropagation ();
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
