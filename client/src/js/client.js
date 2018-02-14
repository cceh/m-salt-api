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
    'name':          '',
    'short_name':    '',
    'main_page_url': null,
    'css':           null,
    'css_url':       null,
    'supported_t13ns_query': ['iso'],
}

// add aliases to conform to API specs
Sanscript.addBrahmicScheme ('deva', Sanscript.schemes.devanagari);
Sanscript.addRomanScheme   ('vh',   Sanscript.schemes.velthuis);

// add iso (ISO 15919) scheme
// See: https://en.wikipedia.org/wiki/ISO_15919#Comparison_with_UNRSGN_and_IAST
Sanscript.addRomanScheme (
    'iso',
    {
        vowels: 'a ā i ī u ū r̥ r̥̄ l̥ l̥̄ ē e ai ō o au'.split(' '),
        other_marks: ['ṁ', 'ḥ', '~'],
        virama: [''],
        consonants: 'k kh g gh ṅ c ch j jh ñ ṭ ṭh ḍ ḍh ṇ t th d dh n p ph b bh m y r l v ś ṣ s h ḻ kṣ jñ'.split(' '),
        symbols: "0 1 2 3 4 5 6 7 8 9 oṃ ' । ॥".split(' ')
    }
);

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

/**
 * Transliterate text nodes.
 *
 * Applies the given t13n to all text nodes under the given root element.
 * Modifies the text nodes in place.
 *
 * @function t13n_text_nodes
 *
 * @param {} node - The root node
 * @param {} from - The source t13n
 * @param {} to   - The destination t13n
 */

function t13n_text_nodes (node, from, to) {
    if (node.nodeType == 3) {
        node.nodeValue = Sanscript.t (node.nodeValue, from, to);
    } else {
        for (var i = 0, len = node.childNodes.length; i < len; ++i) {
            t13n_text_nodes (node.childNodes[i], from, to);
        }
    }
}

function get_closest ($target, data_attr) {
    return $target.closest ('[data-' + data_attr + ']').attr ('data-' + data_attr);
}

function drag_headword (event, headword) {
    event.originalEvent.dataTransfer.setData (DNDTypeHeadword, JSON.stringify ({
        'text' : headword,
        't13n' : get_closest ($ (event.target), 't13n'),
    }));
    $ ('#search').css ({ 'background-color' : '#ff0' })
    setTimeout (function () {
        $ ('#search').css ({ 'background-color' : '#fff' })
    }, 500);
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
    var app = new Vue ({
        el: '#app',
        data: {
            apis: [],  // all known APIs
            api: null, // the API of the currently displayed article

            results: [], // results of the current query
                         // array of (array of headwords)

            article_formats: [],     // list of available article formats
            article_endpoint: null,  // the endpoint url that gave us the list
            article: null,           // the preferred (displayed) article format

            context: [], // context of chosen headword, array of headwords

            // the t13n schemes we support in the order they should appear in the
            // dropdown menu
            supported_t13n: [
                { 'id' : 'deva',   'desc' : 'Devanagari' },
                { 'id' : 'iso',    'desc' : 'ISO 15919' },
                { 'id' : 'iast',   'desc' : 'IAST' },
                { 'id' : 'slp1',   'desc' : 'SLP1' },
                { 'id' : 'hk',     'desc' : 'Harvard-Kyoto' },
                { 'id' : 'vh',     'desc' : 'Velthuis' },
                { 'id' : 'wx',     'desc' : 'WX notation' },
                { 'id' : 'itrans', 'desc' : 'ITRANS' },
            ],

            // when displaying an article we prefer these t13ns in order
            preferred_view_t13n: ['iso', 'slp1', 'hk', 'deva'],

            // model of the user controls
            // with some defaults filled in for easier testing
            user: {
                active_apis: ['cpd', 'cpd2'],
                query: 'ahimsa',
                query_t13n: 'iso',
                article_t13n: 'iso',
            },
        },
        computed: {
            t13n_query_deva: function () {
                return Sanscript.t (this.user.query, this.user.query_t13n, 'deva');
            },
            t13n_article: function () {
                if (this.article) {
                    let from = this.article.t13n;
                    let to = this.user.article_t13n;
                    let $html = $(this.article.text);
                    $html.find ('b').each (function (index, elem) {
                        t13n_text_nodes (elem, from, to);
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
            t13n_headword: function (headword) {
                let html = this.sanitize_headword (headword.text);
                let to = this.user.query_t13n;
                if (headword.t13n !== to) {
                    let $html = $ ('<span>' + html + '</span>');
                    t13n_text_nodes ($html[0], headword.t13n, to);
                    return $html.html ();
                }
                return html;
            },
            on_user_query_t13n : function (event) {
                let from = this.user.query_t13n;
                let to = $ (event.target).attr ('data-t13n');
                this.user.query = Sanscript.t (this.user.query, from, to);
                this.user.query_t13n = to;
            },
            on_user_article_t13n : function (event) {
                this.user.article_t13n = $ (event.target).attr ('data-t13n');
            },
            get_api : function (id) {
                for (let api of this.apis) {
                    if (api.id === id)
                        return api;
                }
                return null;
            },
            get_preferred_view_t13n : function (json) {
                for (let t13n of this.preferred_view_t13n) {
                    for (let a of json) {
                        if (a.mimetype == 'text/x-html-literal' && a.embeddable && a.t13n === t13n)
                            return a;
                    }
                }
                return json.article[0];
            },
            clear_article : function () {
                $ ('style.api-style').remove ();
                this.api = null;
                this.article = null;
                this.article_formats = [];
                this.context = [];
                this.article_endpoint = '';
            },
            do_search: function (event) {
                this.clear_article ();
                this.results.length = 0; // clear
                this.context = [];
                this.api = null;
                this.article = null;
                this.article_endpoint = '';
                for (let id of this.user.active_apis) {
                    let api = this.get_api (id);
                    let q = '';
                    let preferred_t13n = '';
                    if (api.supported_t13ns_query.includes (this.user.query_t13n)) {
                        // the current t13n is supported by the server, use it
                        q = this.user.query;
                        preferred_t13n = this.user.query_t13n;
                    } else {
                        // use the best t13n that is supported by the server
                        for (let scheme of api.supported_t13ns_query) {
                            if (api.supported_t13ns_query.includes (scheme)) {
                                q = Sanscript.t (this.user.query, this.user.query_t13n, scheme);
                                preferred_t13n = scheme;
                                break;
                            }
                        }
                    }
                    if (q !== '') {
                        let url = api.url + 'headwords/?' + $.param ({ 'q' : q, 't13n' : preferred_t13n });
                        $.getJSON (url, (json) => {
                            let dict = {
                                'dict_id' : id,
                                'name' : api.name,
                                'short_name' : api.short_name,
                                'headwords' : json,
                            };
                            this.results.push (dict);
                        });
                    } else {
                        // FIXME: insert some kind of error message
                    }
                }
            },
            do_article: function (event) {
                this.clear_article ();
                let $target = $ (event.currentTarget);
                let article_url   = get_closest ($target, 'article-url');
                let headword_url  = get_closest ($target, 'headword-url');
                let dictionary_id = get_closest ($target, 'dictionary-id');
                this.api = this.get_api (dictionary_id);

                $.get (this.api.url + article_url, (json) => {
                    if (this.api.css) {
                        $ ('head').append (
                            '<style type="text/css" class="api-style">' + this.css + '</style>'
                        );
                    }
                    this.article_formats = json;
                    let article = this.get_preferred_view_t13n (json);
                    article.text = this.sanitize_article (article.text);
                    this.article = article;
                    this.user.article_t13n = article.t13n;
                    this.article_endpoint = article_url;
                });
                $.getJSON (this.api.url + headword_url + '/context/', (json) => {
                    this.context = json;
                });
            },
        },
    });

    // fill in missing information in apis from '/' endpoints of all dictionaries
    // make the attributes known to vue.js early, or they won't be instrumented
    for (let api of APIS) {
        $.getJSON (api.url, (json) => {
            Object.assign (api, API, _.pick (json, ['name', 'short_name', 'main_page_url',
                                                    'css_url', 'css', 't13n_query' ]))
            if (api.css !== '') {
                api.css = scope_css (api.css, '#article');
            }
            if (api.css_url !== '') {
                $.get (api.css_url, (css) => {
                    api.css = scope_css (css, '#article');
                });
            }
            app.apis.push (api);
        });
    }

    $ (document).on ('dragstart', '.headword', function (event) {
        drag_headword (event, get_closest ($ (event.currentTarget), 'headword-normalized-text'));
    });
    $ (document).on ('dragstart', '#article', function (event) {
        drag_headword (event, window.getSelection ().toString ());
    });

    $ ('#search').on ('drop', function (event) {
        event.stopPropagation ();
        event.preventDefault ();
        let data = JSON.parse (event.originalEvent.dataTransfer.getData (DNDTypeHeadword));
        app.user.query = Sanscript.t (data.text, data.t13n, app.user.query_t13n);
        app.do_search (event);
    }).on ('dragover', function (event) {
        event.originalEvent.dataTransfer.dropEffect = 'move';
        event.preventDefault ();
    }).on ('dragenter', function (event) {
        event.preventDefault ();
    });
});
