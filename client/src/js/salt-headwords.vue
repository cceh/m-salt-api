<template>
  <div class="salt-headwords">
    <ul>
      <li v-for="dictionary in dictionaries" class="dictionary" :data-dictionary-id="dictionary.dict_id">
	<h2>{{ dictionary.short_name }}</h2>
	<ul v-bind:class="{ selected: dictionary.dict_id == (api ? api.id : 0)}" :data-script="user.query_lang">
          <li v-for="(headword, index) in dictionary.headwords" v-on:click.prevent="on_article"
              class="headword" draggable="true"
	      :data-headword="JSON.stringify (headword)"
              v-bind:class="{ selected: headword.articles_url == article_endpoint }">
            <a v-html="headword_t13n (headword)"></a>
          </li>
	</ul>
      </li>
    </ul>
  </div>
</template>

<script>
import $ from 'jquery';
import sanitize_html from 'sanitize-html';
import st from './salt-tools';

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
        headword_t13n: function (headword) {
            let html = this.sanitize_headword (headword.text);
	    let from = st.get_t13n (headword.lang);
            let to = this.user.query_lang;
            if (from[0] !== to) {
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
