import $ from 'jquery';
import Sanscript from 'sanscript';

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

function xlate (text, from, to) {
    return Sanscript.t (text, from, to);
}

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
 * @function xlate_text_nodes
 *
 * @param {} node - The root node
 * @param {} from - The source t13n
 * @param {} to   - The destination t13n
 */

function xlate_text_nodes (node, from, to) {
    if (node.nodeType == 3) {
        node.nodeValue = Sanscript.t (node.nodeValue, from, to);
    } else {
        for (var i = 0, len = node.childNodes.length; i < len; ++i) {
            xlate_text_nodes (node.childNodes[i], from, to);
        }
    }
}

/**
 * The inverse of the jQuery.param () function.
 *
 * @function deparam
 *
 * @param {string} query_string - A string in the form "p=1&q=2"
 *
 * @return {Object} { p : 1, q : 2 }
 */

function deparam (query_string) {
    var params = {};
    query_string.split ('&').forEach (item => {
        var s = item.split ('=').map (i => decodeURIComponent (i.replace ('+', ' ')));
        params[s[0]] = s[1];
    });
    return params;
}

function get_t13n (lang) {
    let i = lang.indexOf ('x-');
    if (i > -1)
        return lang.substring (i + 2);
    if (lang.indexOf ('Deva') > -1)
        return 'deva'
    return lang;
}

function get_closest ($target, data_attr) {
    return $target.closest ('[data-' + data_attr + ']').attr ('data-' + data_attr);
}

function flash_input () {
    // flash the input control
    $ ('#search').css ({ 'background-color' : '#ff0' })
    setTimeout (function () {
        $ ('#search').css ({ 'background-color' : '#fff' })
    }, 500);
}

export default {
    scope_css        : scope_css,
    xlate            : xlate,
    xlate_text_nodes : xlate_text_nodes,
    get_t13n         : get_t13n,
    deparam          : deparam,
    get_closest      : get_closest,
    flash_input      : flash_input,
};
