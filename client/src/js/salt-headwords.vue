<template>
  <div class="salt-headwords"> <!-- for animations we need a wrapper that always stays in the DOM -->
    <b-card no-body v-if="data.selected">
      <div slot="header" class="d-flex justify-content-between align-items-center">
        <div v-html="caption ()"></div>
        <div class="text-muted" v-html="icon ()"></div>
      </div>

      <ul class="list-group list-group-flush" :data-script="user.article_lang" :data-dictionary-id="data.id">
        <li class="list-group-item headword" v-for="(headword, index) in paginated_headwords"
            v-bind:key="index"
            v-bind:data-key="index"
            v-on:click.prevent="on_article"
            :class="{ 'list-group-item-primary' : data.id == (article.api ? article.api.id : '') && headword.articles_url == article.endpoint}"
            draggable="true"
            :data-headword="JSON.stringify (headword)">
          <div v-html="headword_t13n (headword)"></div>
        </li>
        <li class="list-group-item headword" v-if="headwords.length === 0" key="-1">
          <div data-script="x-iso">Nothing found</div>
        </li>
      </ul>

      <b-pagination v-if="total_rows > per_page" size="sm" v-model="current_page"
                    :total-rows="total_rows" :per-page="per_page"
                    class="justify-content-center">
      </b-pagination>
    </b-card>
  </div>
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

const ICONS = {
    'busy'    : '<i class="fas fa-sync fa-spin text-warning"></i>',
    'online'  : '<i class="fas fa-check-circle text-success"></i>',
    'offline' : '<i class="fas fa-exclamation-triangle text-danger"></i>',
    'unknown' : '<i class="fas fa-question text-danger"></i>',
}

export default {
    data: function () {
        return {
            headwords: [],
            current_page: 1,
            total_rows: 0,
            status: null,
        };
    },
    props: [
        'article',
        'data',
        'user',
        'per_page',
    ],
    watch: {
        'data.current_url' : function () {
            this.do_ajax ();
        },
        'data.selected' : function () {
            if (this.data.selected) {
                this.do_ajax ();
            }
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
            if (this.data.selected && this.data.current_url !== '') {
                this.status = 'busy';
                let p1 = $.getJSON (this.data.current_url);
                p1.done (() => {
                    const json = p1.responseJSON;
                    this.headwords = json.data;
                    this.current_page = 1;
                    this.total_rows = json.data.length;
                    this.status = 'online';
                }).fail ((json) => {
                    this.status = 'offline';
                    console.log ('Failed URL: ' + this.data.current_url);
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
        on_article: function (event) {
            let $target = $ (event.currentTarget);
            let headword = JSON.parse (st.get_closest ($target, 'headword'));
            headword.dictionary_id = st.get_closest ($target, 'dictionary-id');
            this.$emit ('on_article', headword);
        },
        caption: function () {
            return this.data.caption || this.data.short_name;
        },
        icon: function () {
            return ICONS[this.status || this.data.status];
        },
    },
}

</script>

<style lang="scss">
@import "../css/common.scss";

div.salt-headwords {
    div.card {
        margin-bottom: 1rem;
    }

    /* &:last-child {
       margin-bottom: 0;
    }*/
    .card-header {
        font-weight: bold;
    }
    .card-header, .card-body, .list-group-item {
        padding: 0.25rem 1.25rem;
    }
    ul.pagination {
        margin: 0.5rem 0;
    }
    li.headword {
       transition: background-color 1s;
    }
}

</style>
