.. _contents:

==============================
 M-SALT API 0.1 Documentation
==============================

An API for consulting dictionaries in Sanskrit and Pāli and maybe other ancient
South Asian languages.

.. warning::

   This API is not yet finalized!


Concepts
========

This API returns **articles** and **headwords**.

An article is the atomic unit of content of the dictionary.  An article can have
one or more headwords.

.. graphviz::
   :align: center

   strict digraph G {
     headword1->article;
     headword2->article;
     headword3->article;
     "..."->article;
   }

The article may be available in many different formats, eg. as fully marked up
TEI, or as a series of scanned images.

The article may also be available in Devanagari or in a latin transliteration,
eg. SLP1 or Harvard-Kyoto.

The relation between articles and headwords is 1:N.  A headword cannot point to
more than one article but more than one headword may point to one article.

The API is designed to allow a client to search multiple dictionaries at once.

The API can be mounted on an arbitrary root URL. Examples::

  https://api.cpd.uni-koeln.de/
  https://api.cpd.uni-koeln.de/v1/
  https://www.uni-koeln.de/cpd/api/v1/
  https://cpd.uni-koeln.de/api/1/

It is strongly recommended to have an API version indicator in the mount point
to allow easier upgrading by running two versions concurrently.

All responses of this API are in JSON format.  All endpoints ending in "/"
(except the root endpoint) return JSON arrays. All other endpoints return a JSON
object.


.. _t13n:

Transliterations
----------------

Transliteration (t13n) is the act of representing Devanagari script in Latin
characters.

The API supports following transliteration schemes:

  - iso:  ISO 15919      https://en.wikipedia.org/wiki/ISO_15919
  - hk:   Harvard-Kyoto  https://en.wikipedia.org/wiki/Harvard-Kyoto
  - slp1: SLP1           https://en.wikipedia.org/wiki/SLP1
  - deva: Devanagari     (no transliteration)

Different dictionaries may have adopted different transliteraton schemes.  The
client needs to know which transliterations the server offers for articles and
which it accepts for queries.

See also: https://en.wikipedia.org/wiki/Devanagari_transliteration


.. _embed:

Embedded HTML
-------------

The client using the API may wish to display the HTML of the article embedded in
a page of the client's choice.  To make this seemless the HTML must be sanitized
by the client and the CSS needed for correct display of your HTML should be
provided by the :http:get:`/` endpoint.

Sanitized HTML in articles may contain only the tags: div, p, span, i, b, em,
strong, sup, sub, br, all with an optional class attribute.

Sanitized HTML in headwords may contain only the tags: i, sup, sub, without
attributes.  This is to allow the client to merge the headwords it got from
different dictionaries in a visually pleasing way.


Endpoints
=========

.. http:get:: /

   Get information about the dictionary.

   **Example request**:

   .. sourcecode:: http

      GET / HTTP/1.1
      Host: api.cpd.uni-koeln.de

   **Example response**:

   .. sourcecode:: http

      HTTP/1.1 200 OK
      Content-Type: application/json

      {
        "short_name": "CPD",
        "name": "A Critical P\u0101li Dictionary",
        "css": "span.smalltext { font-size: smaller }",
        "t13n_query" : ["iso", "slp1", "deva"]
      }

   :resheader Content-Type: application/json
   :statuscode 200: no error
   :resjsonobj string short_name: A siglum or short name of the dictionary.
                                  Max. 10 unicode characters.
   :resjsonobj string name: A longer name of the dictionary.
                            Max. 80 unicode characters.
   :resjsonobj string css: Any CSS needed to display the HTML version of your
                           articles. See `embedded HTML <embed>`.
   :resjsonobj url css_url: Optional.  Alternatively an URL to your CSS sheet.
   :resjsonobj array t13n_query: The :ref:`transliterations <t13n>` supported by
                                 the server for queries.


.. http:get:: /headwords/

   Get a list of headwords.

   **Example request**:

   .. sourcecode:: http

      GET /headwords/?q=ahimsa*&t13n=slp1&limit=5 HTTP/1.1
      Host: api.cpd.uni-koeln.de

   **Example response**:

   .. sourcecode:: http

      HTTP/1.1 200 OK
      Content-Type: application/json

      [
        {"article_url": "article/11411", "headword": "a-hi\u1e41sa",   "t13n": "iso", "url": "headword/43681"},
        {"article_url": "article/11412", "headword": "a-hi\u1e41sa",   "t13n": "iso", "url": "headword/43685"},
        {"article_url": "article/11413", "headword": "a-hi\u1e41saka", "t13n": "iso", "url": "headword/43687"},
        {"article_url": "article/11412", "headword": "a-hi\u1e41sat",  "t13n": "iso", "url": "headword/43683"},
        {"article_url": "article/11419", "headword": "a-hi\u1e41sana", "t13n": "iso", "url": "headword/43698"}
      ]

   :query q: query. Restrict the result to headwords matching this query.
   :query t13n: :ref:`transliteration <t13n>` scheme of the `q`
                parameter. Default "iso".
   :query limit: limit number. Default 100.
   :query offset: offset number. Default 0.
   :resheader Content-Type: application/json
   :statuscode 200: no error
   :resjsonobj string headword: the headword. :ref:`Some HTML <embed>` allowed.
   :resjsonobj url url: the headword endpoint url relative to the API root.
   :resjsonobj url article_url: the article endpoint url of the article relative to the API root.
   :resjsonobj string t13n: The transliteration applied to the headword. Default "iso".

   If `q` is not specified, retrieve a list of all headwords.

   `q` is allowed to contain globs, eg. the character "*" stands for any
   sequence of characters and the character "?" stands for any single character.

   The `t13n` parameter on the request is the :ref:`transliteration <t13n>` used
   in the `q` parameter.  The transliteration used in the response may be
   different and is indicated in the response's `t13n` parameter.

   See also: the :http:get:`/` endpoint.


.. http:get:: /headwords/(id)

   Get one headword.

   **Example request**:

   .. sourcecode:: http

      GET /headwords/43704 HTTP/1.1
      Host: api.cpd.uni-koeln.de

   **Example response**:

   .. sourcecode:: http

      HTTP/1.1 200 OK
      Content-Type: application/json

      {
        "article_url": "article/11421",
        "headword": "a-hi\u1e41s\u0101",
        "t13n": "iso",
        "url": "headword/43704"
      }

   :param id: The headword id. See: :http:get:`/articles/(id)`.
   :resheader Content-Type: application/json
   :statuscode 200: no error
   :statuscode 404: headword not found
   :resjsonobj string headword: the headword. :ref:`Some HTML <embed>` allowed.
   :resjsonobj url url: the headword endpoint url relative to the API root.
   :resjsonobj url article_url: the article endpoint url of the article relative to the API root.
   :resjsonobj string t13n: The transliteration applied to the headword. Default "iso".


.. http:get:: /headwords/(id)/context/

   Get some headwords that alphabetically surround the article's headword.

   **Example request**:

   .. sourcecode:: http

      GET /headwords/43704/context/?limit=2 HTTP/1.1
      Host: api.cpd.uni-koeln.de

   **Example response**:

   .. sourcecode:: http

      HTTP/1.1 200 OK
      Content-Type: application/json

      [
        {"article_url": "article/11420", "headword": "a-hi\u1e41saya", "t13n": "iso", "url": "headword/43702"},
        {"article_url": "article/11420", "headword": "a-hi\u1e41sayat", "t13n": "iso", "url": "headword/43700"},
        {"article_url": "article/11421", "headword": "a-hi\u1e41s\u0101", "t13n": "iso", "url": "headword/43704"},
        {"article_url": "article/11437", "headword": "a-hita", "t13n": "iso", "url": "headword/43733"},
        {"article_url": "article/11450", "headword": "a-hira\u00f1\u00f1a", "t13n": "iso", "url": "headword/43759"}
      ]

   :param id: The article id. See: :http:get:`/articles/(id)`.
   :query limit: limit number of returned headwords. The call returns limit
                 headwords before the headword, the headword, and limit
                 headwords after the headword, totalling (limit * 2 + 1)
                 headwords.  Default 10.
   :resheader Content-Type: application/json
   :statuscode 200: no error
   :statuscode 404: article not found
   :resjsonobj string headword: the headword. :ref:`Some HTML <embed>` allowed.
   :resjsonobj url url: the headword endpoint url relative to the API root.
   :resjsonobj url article_url: the article endpoint url of the article relative to the API root.
   :resjsonobj string t13n: The transliteration applied to the headword. Default "iso".


.. http:get:: /articles/(id)

   Get an article's content.

   **Example request**:

   .. sourcecode:: http

      GET /articles/42 HTTP/1.1
      Host: api.cpd.uni-koeln.de

   **Example response**:

   .. sourcecode:: http

      HTTP/1.1 200 OK
      Content-Type: application/json

      [
        {
          "mimetype" : "text/x-html-literal",
          "embeddable": true,
          "t13n" : "iso",
          "text" : "<div>...</div>"
        },
        {
          "mimetype" : "text/html",
          "embeddable": true,
          "canonical": true,
          "t13n" : "iso",
          "root" : "div.article",
          "url"  : ["https://..."]
        },
        {
          "mimetype" : "text/html",
          "embeddable": true,
          "t13n" : "deva",
          "root" : "div.article",
          "url" : ["https://..."]
        },
        {
          "mimetype" : "application/xml+tei",
          "url" : ["https://..."]
        },
        {
          "mimetype" : "image/jpeg",
          "embeddable": true,
          "t13n" : "deva",
          "url" : ["https://img1", "https://img2", "..."]
        }
      ]

   :param id: The article id. Can be any string that is convenient to the server
              and does not contain URL special characters.
   :resheader Content-Type: application/json
   :statuscode 200: no error
   :statuscode 404: article not found
   :resjsonobj string mimetype: The mimetype of the resource pointed to by `url`
                                or contained in `text`.
   :resjsonobj boolean embeddable: Optional.  True if the resource is
                                   embeddable.
   :resjsonobj boolean canonical: Optional.  True if this url is the citeable
                                  canonical URL for the article.
   :resjsonobj string t13n: The transliteration applied to that article. Default "iso".
   :resjsonobj url    url: Optional. An array of urls to a series of resources
                           containing the article.
   :resjsonobj string text: Optional. Alternatively the article can be included
                            literally. :ref:`Some HTML <embed>` allowed.
   :resjsonobj string root: Optional. A CSS selector pointing to the element in
                            the DOM that contains the article proper. Default is
                            the root element of the returned resource.

   The article can be served in the fashion most convenient for the server.

   If the article is available as HTML, then the URL to the HTML version SHOULD
   always be included.  If the article is available as image (or as a series of
   images) the URLs to all images SHOULD be provided in the correct order of
   reading.

   The client will pick the most appropriate resource from the list depending on
   user preferences.  The client will allow the user to cycle through a set of
   images.

   The `mimetype` parameter indicates the mimetype of the resource.  It MUST be
   the same as the content-type of the server's response.

   The `canonical` parameter MUST be true iff the `url` represents the
   canonical, citeable URL for the article.

   The `embeddable` parameter SHOULD be true if the resource (or the element
   pointed to by `root`) is embeddable, eg.:

     - the resource contains only the article proper,
     - it is self-contained HTML

   but it MUST NOT be true if the resource is not embeddable.

   The :ref:`t13n` parameter indicates which transliteration was used for
   Devanagari script in the article.

   :mimetype:`text/x-html-literal` is a custom mimetype used to indicate that
   the article HTML has been included literally instead of being referenced by
   url.  Including the article's text may save the client one trip to the
   server.

   The `root` parameter is a CSS selector to the root element in the HTML
   containing the article proper.  Set this if the HTML you serve contains
   extraneous information like headers, footers, navigation bars, etc. Default
   "article".


Indices and tables
==================

* :ref:`genindex`
* :ref:`modindex`
* :ref:`search`
