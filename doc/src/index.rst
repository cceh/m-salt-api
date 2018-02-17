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

The API defines the following private use subtags for indication of
transliteration:

============= ============== ===========================================
subtag        Name           Description
============= ============== ===========================================
Deva          Devanagari     (no transliteration)
Latn-x-hk     Harvard-Kyoto  https://en.wikipedia.org/wiki/Harvard-Kyoto
Latn-x-iast   IAST           https://en.wikipedia.org/wiki/IAST
Latn-x-iso    ISO 15919      https://en.wikipedia.org/wiki/ISO_15919
Latn-x-itrans ITRANS         https://en.wikipedia.org/wiki/ITRANS
Latn-x-slp1   SLP1           https://en.wikipedia.org/wiki/SLP1
Latn-x-vh     Velthuis       https://en.wikipedia.org/wiki/Velthuis
Latn-x-wx     WX notation    https://en.wikipedia.org/wiki/WX_notation
============= ============== ===========================================

In the server's response the subtag MAY be preceded by a language tag.  It is
the client's responsibility to extract the t13n from a language tag. These are
valid tags:

 - sa-Latn-x-iso
 - pi-Deva
 - sa-x-hk
 - x-slp1

Different dictionaries may have adopted different transliteraton schemes.  The
client needs to know which transliterations the server accepts for queries, and
whicht transliteration was used in the server's answers.

When declaring transliterations in HTML use the lang attribute. Examples:

 - <span land="sa-Latn-x-iso">...</span>
 - <span lang="pi-Deva">...</span>
 - <span lang="sa-x-hk">...</span>
 - <span lang="x-slp1">...</span>


See also:

 - https://en.wikipedia.org/wiki/Devanagari_transliteration
 - https://tools.ietf.org/html/rfc5646#section-2.2.7


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
        "css": "span.smalltext { font-size: smaller }",
        "main_page_url": "http://cpd.uni-koeln.de/",
        "name": "A Critical P\u0101li Dictionary",
        "short_name": "CPD",
        "supported_langs_query": [ "pi-Latn-x-iso" ]
      }

   :resheader Content-Type: application/json
   :statuscode 200: no error
   :resjsonobj string short_name: A siglum or short name of the dictionary.
                                  Max. 10 unicode characters.
   :resjsonobj string name: A longer name of the dictionary.
                            Max. 80 unicode characters.
   :resjsonobj url main_page_url: The URL of the main page of the dictionary.
   :resjsonobj string css: Optional.  Any CSS needed to display the HTML version
                           of your articles. Use either `css` or `css_url` or
                           none.  See :ref:`embedded HTML <embed>`.
   :resjsonobj url css_url: Optional.  An URL to your CSS sheet.  Use either
                            `css` or `css_url` or none.  See :ref:`embedded HTML
                            <embed>`.
   :resjsonobj array supported_langs_query: The :ref:`transliterations <t13n>`
                                 supported by the server for queries, in order
                                 of preference.

   When sending the query to the server, the client MAY transliterate the user's
   chosen t13n to one accepted by the server.  The client MUST display an error
   message if unable to do so.  The client SHOULD use the user's chosen t13n
   scheme if the server accepts it.


.. http:get:: /headwords/

   Get a list of headwords.

   **Example request**:

   .. sourcecode:: http

      GET /headwords/?q=ahimsa*&lang=x-slp1&limit=3 HTTP/1.1
      Host: api.cpd.uni-koeln.de

   **Example response**:

   .. sourcecode:: http

      HTTP/1.1 200 OK
      Content-Type: application/json

      [
        {
          "articles_url": "articles/11411",
          "normalized_text": "a-hi\u1e41sa",
          "lang": "Latn-x-iso",
          "text": "[a-hi\u1e41sa",
          "headwords_url": "headwords/43681"
        },
        {
          "articles_url": "articles/11412",
          "normalized_text": "a-hi\u1e41sa",
          "lang": "Latn-x-iso",
          "text": "a-hi\u1e41sa",
          "headwords_url": "headwords/43685"
        },
        {
          "articles_url": "articles/11413",
          "normalized_text": "a-hi\u1e41saka",
          "lang": "Latn-x-iso",
          "text": "a-hi\u1e41saka",
          "headwords_url": "headwords/43687"
        }
      ]

   :query q: The query. Restrict the result to headwords matching this query.
   :query fulltext: Fulltext query. Restrict the result to headwords of articles
                    matching this text.
   :query lang: :ref:`transliteration <t13n>` scheme of the `q` and `fulltext`
                parameters. Default "Latn-x-iso".
   :query limit: limit number. Default 100.
   :query offset: offset number. Default 0.
   :resheader Content-Type: application/json
   :statuscode 200: no error
   :statuscode 400: Bad Request.  If the server does not support fulltext
                    searches.


   For the response object parameters see: :http:get:`/headwords/(id)`.

   If both `q` and `fulltext` are specified the filters are both applied.  If
   neither `q` nor `fulltext` are specified, this call retrieves a list of all
   headwords.

   `q` is allowed to contain globs, eg. the character "*" stands for any
   sequence of characters and the character "?" stands for any single character.

   The `lang` parameter on the request is the :ref:`transliteration <t13n>` used
   in the `q` and `fulltext` parameters.  The transliteration used in the
   response may be different and is indicated in the response's `lang`
   parameter.

   A server not supporting fulltext searches MUST return a http status 400 bad
   request.

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
        "articles_url": "articles/11421",
        "normalized_text": "a-hi\u1e41s\u0101",
        "lang": "Latn-x-iso",
        "text": "a-hi\u1e41s\u0101",
        "headwords_url": "headwords/43704"
      }

   :param id: The headword id. See: :http:get:`/articles/(id)`.
   :resheader Content-Type: application/json
   :statuscode 200: no error
   :statuscode 404: headword not found
   :resjsonobj url articles_url: the article endpoint URL of the article relative to the API root.
   :resjsonobj url headwords_url: the headword endpoint URL relative to the API root.
   :resjsonobj string normalized_text: the headword as it would be sent in the
                                       `q` parameter.
   :resjsonobj string lang: The :ref:`transliteration <t13n>` applied to the
                            headword. Default "Latn-x-iso".
   :resjsonobj string text: the headword. :ref:`Some HTML <embed>` allowed.


.. http:get:: /headwords/(id)/context/

   Get some headwords that alphabetically surround the article's headword.

   **Example request**:

   .. sourcecode:: http

      GET /headwords/43704/context/?limit=1 HTTP/1.1
      Host: api.cpd.uni-koeln.de

   **Example response**:

   .. sourcecode:: http

      HTTP/1.1 200 OK
      Content-Type: application/json

      [
        {
          "articles_url": "articles/11420",
          "normalized_text": "a-hi\u1e41sayat",
          "lang": "Latn-x-iso",
          "text": "a-hi\u1e41sayat",
          "headwords_url": "headwords/43700"
        },
        {
          "articles_url": "articles/11421",
          "normalized_text": "a-hi\u1e41s\u0101",
          "lang": "Latn-x-iso",
          "text": "a-hi\u1e41s\u0101",
          "headwords_url": "headwords/43704"
        },
        {
          "articles_url": "articles/11437",
          "normalized_text": "a-hita",
          "lang": "Latn-x-iso",
          "text": "a-hita",
          "headwords_url": "headwords/43733"
        }
      ]

   :param id: The article id. See: :http:get:`/articles/(id)`.
   :query limit: limit number of returned headwords. The call returns limit
                 headwords before the headword, the headword, and limit
                 headwords after the headword, totalling (limit * 2 + 1)
                 headwords.  Default 10.
   :resheader Content-Type: application/json
   :statuscode 200: no error
   :statuscode 404: article not found

   For the response object parameters see: :http:get:`/headwords/(id)`


.. http:get:: /articles/(id)

   Get the article.

   **Example request**:

   .. sourcecode:: http

      GET /articles/42 HTTP/1.1
      Host: api.cpd.uni-koeln.de

   **Example response**:

   .. sourcecode:: http

      HTTP/1.1 200 OK
      Content-Type: application/json

      {
        "articles_url" : "/article/42",
      }

   :param id: The article id. Can be any string that is convenient to the server
              and does not contain URL special characters.
   :resheader Content-Type: application/json
   :statuscode 200: no error
   :statuscode 404: article not found
   :resjsonobj url articles_url: The endpoint URL of the article.

   A quite pointless endpoint.  Included for aesthetical reasons (symmetry with
   :http:get:`/headwords/(id)`)


.. http:get:: /articles/(id)/formats/

   Get a list of an article's available formats.

   **Example request**:

   .. sourcecode:: http

      GET /articles/42/formats/ HTTP/1.1
      Host: api.cpd.uni-koeln.de

   **Example response**:

   .. sourcecode:: http

      HTTP/1.1 200 OK
      Content-Type: application/json

      [
        {
          "mimetype" : "text/x-html-literal",
          "embeddable": true,
          "lang" : "Latn-x-iso",
          "text" : "<div>...</div>"
        },
        {
          "mimetype" : "text/html",
          "embeddable": true,
          "canonical": true,
          "lang" : "Latn-x-iso",
          "root" : "div.article",
          "urls"  : ["https://..."]
        },
        {
          "mimetype" : "text/html",
          "embeddable": true,
          "lang" : "deva",
          "root" : "div.article",
          "urls" : ["https://..."]
        },
        {
          "mimetype" : "application/xml+tei",
          "urls" : ["https://..."]
        },
        {
          "mimetype" : "image/jpeg",
          "embeddable": true,
          "lang" : "deva",
          "urls" : ["https://img1", "https://img2", "..."]
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
   :resjsonobj boolean canonical: Optional.  True if this URL is the citeable
                                  canonical URL for the article.
   :resjsonobj string lang: The :ref:`transliteration <t13n>` applied to that
                            article. Default "Latn-x-iso".
   :resjsonobj url urls: Optional. An array of URLs to a series of resources
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

   The type :mimetype:`text/x-html-literal` is a custom mimetype used to
   indicate that the article HTML has been included literally in the `text`
   parameter instead of being referenced by URL.  Including the article's text
   may save the client one trip to the server.

   The `embeddable` parameter SHOULD be true if the resource (or the element
   pointed to by `root`) is embeddable, eg.:

     - the resource contains only the article proper,
     - it is self-contained HTML

   but it MUST NOT be true if the resource is not embeddable.

   The `canonical` parameter MUST be true iff the `url` represents the
   canonical, citeable URL for the article.

   The `lang` parameter indicates which :ref:`transliteration <t13n>` was used
   for Devanagari script in the article.

   The `urls` parameter is always an array even with only one URL returned.

   The `root` parameter is a CSS selector to the root element in the HTML
   containing the article proper.  Set this if the HTML you serve contains
   extraneous information like headers, footers, navigation bars, etc. Default
   "article".


.. http:get:: /articles/(id)/headwords/

   Get a list of an article's headwords.

   **Example request**:

   .. sourcecode:: http

      GET /articles/11412/headwords/ HTTP/1.1
      Host: api.cpd.uni-koeln.de

   **Example response**:

   .. sourcecode:: http

      HTTP/1.1 200 OK
      Content-Type: application/json

      [
        {
          "articles_url": "articles/11412",
          "normalized_text": "a-hi\u1e41sa",
          "lang": "Latn-x-iso",
          "text": "a-hi\u1e41sa",
          "headwords_url": "headwords/43685"
        },
        {
          "articles_url": "articles/11412",
          "normalized_text": "a-hi\u1e41sat",
          "lang": "Latn-x-iso",
          "text": "a-hi\u1e41sat",
          "headwords_url": "headwords/43683"
        }
      ]

   :param id: The article id. See: :http:get:`/articles/(id)`.
   :resheader Content-Type: application/json
   :statuscode 200: no error
   :statuscode 404: article not found

   For the response object parameters see: :http:get:`/headwords/(id)`


Indices and tables
==================

* :ref:`genindex`
* :ref:`modindex`
* :ref:`search`
