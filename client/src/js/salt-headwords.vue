<template>
  <b-card no-body class="salt-headwords">
    <div slot="header" class="d-flex justify-content-between align-items-center">
      <div v-html="data.caption"></div>
      <div class="text-muted" v-html="data.icon"></div>
    </div>

    <b-list-group flush
                  :data-script="user.article_lang" :data-dictionary-id="data.id">
      <b-list-group-item href="#"
                         v-for="(headword, index) in paginated_headwords" :key="index"
                         v-on:click.prevent="on_article"
                         v-bind:variant="data.id == (api ? api.id : '') && headword.articles_url == article_endpoint ? 'primary' : ''"
                         class="headword" draggable="true"
                         :data-headword="JSON.stringify (headword)">
        <div v-html="headword_t13n (headword)"></div>
      </b-list-group-item>
      <b-list-group-item button v-if="busy" class="text-center">
        <i class="fas fa-sync fa-spin"></i>
      </b-list-group-item>
      <b-list-group-item button v-if="nothing_found">
        Nothing found
      </b-list-group-item>
    </b-list-group>

    <b-pagination v-if="total_rows > per_page" size="sm" v-model="current_page"
                  :total-rows="total_rows" :per-page="per_page"
                  class="justify-content-center">
    </b-pagination>
  </b-card>
</template>

<script>
import Vue from 'vue';
import $ from 'jquery';
import sanitize_html from 'sanitize-html';
import st from './salt-tools';

import { Pagination, Card, ListGroup } from 'bootstrap-vue/es/components';
Vue.use (Pagination);
Vue.use (Card);
Vue.use (ListGroup);

export default {
    data: function () {
        return {
            headwords: [],
            current_page: 1,
            total_rows: 0,
            busy: false,
            nothing_found: false,
        };
    },
    props: [
        'api',
        'data',
        'article_endpoint',
        'user',
        'per_page',
    ],
    watch: {
        'data.current_url' : function (new_value) {
            this.do_ajax ();
        },
    },
    computed: {
        paginated_headwords: function () {
            return this.headwords.slice (
                (this.current_page - 1) * this.per_page, this.current_page * this.per_page
            );
        },
    },
    methods: {
        do_ajax: function () {
            this.headwords = [];
            this.current_page = 1;
            this.total_rows = 0;
            this.nothing_found = false;
            if (this.current_url !== '') {
                this.busy = true;
                $.getJSON (this.data.current_url).done ((json) => {
                    this.headwords = json.data;
                    this.total_rows = json.data.length;
                    this.nothing_found = this.headwords.length === 0;
                }).always ((json) => {
                    this.busy = false;
                });
            }
        },
        sanitize_headword: function (html) {
            return sanitize_html (html, {
                allowedTags: [ 'i', 'sup', 'sub' ],
                allowedAttributes: {
                    '*' : [], // no class attributes allowed because
                              // we don't allow any custom CSS here
                },
            });
        },
        headword_t13n: function (headword) {
            let html = this.sanitize_headword (headword.text);
            let from = headword.lang;
            let to = this.user.article_lang;
            if (st.need_t13n (from, to)) {
                let $html = $ ('<span>' + html + '</span>');
                st.xlate_dom ($html[0], from, to);
                return $html.html ();
            }
            return html;
        },
        on_search: function (event) {
            let $target = $ (event.currentTarget);
            let headword = JSON.parse (st.get_closest ($target, 'headword'));
            headword.dictionary_id = st.get_closest ($target, 'dictionary-id');
            this.$emit ('on_search', headword);
        },
        on_article: function (event) {
            let $target = $ (event.currentTarget);
            let headword = JSON.parse (st.get_closest ($target, 'headword'));
            headword.dictionary_id = st.get_closest ($target, 'dictionary-id');
            this.$emit ('on_article', headword);
        }
    },
}

</script>

<style lang="scss">
@import "../css/common.scss";

div.salt-headwords {
    margin: 1rem 0;
    &:first-child {
        margin-top: 0;
    }
    &:last-child {
        margin-bottom: 0;
    }
    .card-header, .list-group-item {
        padding: 0.25rem 1.25rem;
    }
    ul.pagination {
        margin: 0.5rem 0;
    }
    .card-header {
        font-weight: bold;
    }
}
</style>
