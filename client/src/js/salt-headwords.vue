<template>
  <div class="salt-headwords">
    <ul>
      <li v-for="dictionary in dictionaries" class="dictionary" :data-dictionary-id="dictionary.dict_id">
	<h2>{{ dictionary.short_name }}</h2>
	<ul v-bind:class="{ selected: dictionary.dict_id == (api ? api.id : 0)}" :data-script="user.query_t13n">
          <li v-for="headword in dictionary.headwords" v-on:click.prevent="on_article"
              class="headword" draggable="true"
              :data-headword-url="headword.url"
              :data-article-url="headword.article_url"
              :data-headword-normalized-text="headword.normalized_text"
              :data-t13n="headword.t13n"
              v-bind:class="{ selected: headword.article_url == article_endpoint }">
            <a v-html="t13n_headword (headword)"></a>
          </li>
	</ul>
      </li>
    </ul>
  </div>
</template>

<script>
import $ from 'jquery';
import sanitize_html from 'sanitize-html';
import salt_tools from './salt-tools';

export default {
    data : function () {
        return {
	};
    },
    props: [
        'dictionaries',
        'api',
        'article_endpoint',
        'user',
    ],
    methods: {
        sanitize_headword: function (html) {
            return sanitize_html (html, {
                allowedTags: [ 'i', 'sup', 'sub' ],
                allowedAttributes: {
                    '*' : [], // no class attribute because we don't have
                    // any custom CSS here
                },
            });
        },
        t13n_headword: function (headword) {
            let html = this.sanitize_headword (headword.text);
            let to = this.user.query_t13n;
            if (headword.t13n !== to) {
                let $html = $ ('<span>' + html + '</span>');
                salt_tools.t13n_text_nodes ($html[0], headword.t13n, to);
                return $html.html ();
            }
            return html;
        },
        on_article: function (event) {
            this.$emit ('on_article', event);
        }
    },
}

</script>

<style lang="scss">
@import "../css/common.scss";

div.salt-headwords {
    ul {
        list-style-type: none;
    	margin-top: 1rem;
	padding: 0;
    }
    h2 {
        margin-top: 1rem;
        font-size: 120%;
        font-weight: bold;
    }
    li.headword {
        cursor: pointer;
        &:hover {
            background-color: $bg-gray;
        }
    }
    ul.selected > li.headword.selected {
        &:before {
            display: block;
            float: left;
            margin-left: -1.5em;
            content: "⯈";
        }
    }
}
</style>
