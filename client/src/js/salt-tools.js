import $ from 'jquery';
import sanscript from 'sanscript';

// Add aliases to conform to API specs.  FIXME: vedic accents will not work
// because the library uses the hardcoded name 'devanagari' to enable those.
sanscript.addBrahmicScheme ('deva', sanscript.schemes.devanagari);

// Add an iso (ISO 15919) scheme from a modified iast scheme.
// See: https://en.wikipedia.org/wiki/ISO_15919#Comparison_with_UNRSGN_and_IAST
let iso = $.extend (true, {}, sanscript.schemes.iast);
iso.vowels = 'a ā i ī u ū r̥ r̥̄ l̥ l̥̄ ē e ai ō o au'.split(' ');
iso.other_marks = ['ṁ', 'ḥ', '~'];
sanscript.addRomanScheme ('iso', iso);


function need_t13n (from, to) {
    return get_t13n (from) !== get_t13n (to);
}

/**
 * Transliterate string.
 *
 * Applies the given t13n to a string.
 *
 * @function xlate
 *
 * @param {node} root   - The root node
 * @param {string} from - The source t13n
 * @param {string} to   - The destination t13n
 *
 * @returns A transliterated string.
 */

function xlate (text, from, to) {
    from = get_t13n (from);
    to = get_t13n (to);
    if (from === to)
        return text;
    if (['x-iso', 'x-iast', 'x-velthuis'].includes (from)) {
        // cheap fix for non-standard iso, iast, and velthuis
        text = text.toLowerCase ();
    }
    try {
        return sanscript.t (text, from.slice (2), to.slice (2));
    }
    catch (e) {
        return 'lost in transliteration';
    }
}

/**
 * Transliterate text nodes.
 *
 * Applies the given t13n to a DOM fragment, modifying in place all text nodes
 * under the given root element.
 *
 * @function xlate_dom
 *
 * @param {node} root   - The root node
 * @param {string} from - The source t13n
 * @param {string} to   - The destination t13n
 */

function xlate_dom (root, from, to) {
    if (root.nodeType == 3) {
        root.nodeValue = xlate (root.nodeValue, from, to);
    } else {
        for (let i = 0, len = root.childNodes.length; i < len; ++i) {
            xlate_dom (root.childNodes[i], from, to);
        }
    }
}

/**
 * Extract the language subtag used to indicate t13n.
 *
 * @function get_t13n
 *
 * @param {string} lang - A full language tag, see API specs.
 *
 * @returns {string} The t13n subtag, eg. x-iso
 */

function get_t13n (lang) {
    const tags = lang.split ('-');
    const i = tags.findIndex (el => el === 'x');

    if (0 <= i && i < tags.length)
        return 'x-' + tags[i + 1];

    if (tags.findIndex (el => el === 'Deva') >= 0)
        return ['x-deva'];

    return ['x-und']; // undefined
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
 * The inverse of the jQuery.param () function.
 *
 * @function deparam
 *
 * @param {string} query_string - A string in the form "p=1&q=2"
 *
 * @return {Object} { p : 1, q : 2 }
 */

function deparam (query_string) {
    let params = {};
    query_string.split ('&').forEach (item => {
        let s = item.split ('=').map (i => decodeURIComponent (i.replace ('+', ' ')));
        params[s[0]] = s[1];
    });
    return params;
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
    xlate       : xlate,
    xlate_dom   : xlate_dom,
    get_t13n    : get_t13n,
    need_t13n   : need_t13n,
    scope_css   : scope_css,
    deparam     : deparam,
    get_closest : get_closest,
    flash_input : flash_input,
};
