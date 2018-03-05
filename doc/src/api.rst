==============================
 M-SALT API 0.1 Documentation
==============================

An API for consulting dictionaries in Sanskrit and Pāli and maybe other ancient
South Asian languages.

.. warning:: This API is not yet finalized!

.. TODO: Handle inter-article references in dictionaries.


Overview
========

An **article** is the atomic unit of content of a dictionary.  An article can
have one or more **headwords.** The article may be available in different
**formats,** eg. as fully marked up TEI, or as a series of scanned images.  The
article may also be available in different :ref:`transliterations <t13n>`.

.. uml::
   :align: center
   :caption: Example of an article with its relations.

   skinparam ObjectAttributeFontSize 12

   object "headword" as h1 {
     अ-हिंस
   }
   object "headword" as h2 {
     अ-हिंसत्
   }
   object "headword" as h3 {
     अ-हिंसा
   }
   object "article" as a
   object "format" as f1 {
      HTML Deva
   }
   object "format" as f2 {
      HTML Latin
   }
   object "format" as f3 {
      TEI
   }
   object "format" as f4 {
      Set of Images
   }

   h1 -- a
   h2 -- a
   h3 -- a
   a  -- f1
   a  -- f2
   a  -- f3
   a  -- f4


The API is designed to allow a client to search multiple dictionaries at once.
See :ref:`Headword Search <seq-search>`.

All responses of this API are in JSON format.


Overview of Endpoints
---------------------

This is an overview of the API structure, with all endpoints and the respective
response classes.

.. uml::
   :align: center
   :caption: Overview of the API.

   hide stereotype
   hide empty methods

   interface "[[../api.html#get--v1 v1]]" as info <<endpoint>> {
   Information
   -- http --
   info get ()
   }

   interface "[[../api.html#get--v1-headwords headwords]]" as h <<endpoint>> {
   List of headwords and search
   -- http --
   headwords get ()
   }

   interface "[[../api.html#get--v1-headwords-(id) (id)]]" as hi <<endpoint>> {
   Headword
   -- http --
   headwords get ()
   }

   interface "[[../api.html#get--v1-headwords-(id)-context context]]" as hic <<endpoint>> {
   Context of a headword
   -- http --
   headwords get ()
   }

   interface "[[../api.html#get--v1-articles articles]]" as a <<endpoint>> {
   List of articles
   -- http --
   articles get ()
   }

   interface "[[../api.html#get--v1-articles-(id) (id)]]" as ai <<endpoint>> {
   Article
   -- http --
   articles get ()
   }

   interface "[[../api.html#get--v1-articles-(id)-formats formats]]" as aif <<endpoint>> {
   List of article formats
   -- http --
   formats get ()
   }

   interface "[[../api.html#get--v1-articles-(id)-headwords headwords]]" as aih <<endpoint>> {
   List of article headwords
   -- http --
   headwords get ()
   }

   info --> h
   info --> a
   h   --> hi
   hi  --> hic
   a   --> ai
   ai  --> aif
   ai  --> aih


.. _t13n:

Transliterations
----------------

Transliteration (t13n) is the act of representing Devanagari script in Latin
script.

The API defines the following `private use language subtags
<https://tools.ietf.org/html/rfc5646#section-2.2.7>`_ to indicate
transliterations to Latin script:

=============== ============== ===========================================
subtag          Name           Description
=============== ============== ===========================================
Deva            Devanagari     (official subtag, no transliteration)
Latn-x-hk       Harvard-Kyoto  https://en.wikipedia.org/wiki/Harvard-Kyoto
Latn-x-iast     IAST           https://en.wikipedia.org/wiki/IAST
Latn-x-iso      ISO 15919      https://en.wikipedia.org/wiki/ISO_15919
Latn-x-itrans   ITRANS         https://en.wikipedia.org/wiki/ITRANS
Latn-x-slp1     SLP1           https://en.wikipedia.org/wiki/SLP1
Latn-x-velthuis Velthuis       https://en.wikipedia.org/wiki/Velthuis
Latn-x-wx       WX notation    https://en.wikipedia.org/wiki/WX_notation
=============== ============== ===========================================

The server MUST answer with valid :RFC:`5646` language tags, that is, it should
prepend a valid language tag.  These are valid tags:

 - sa-Latn-x-iso
 - pi-Deva
 - x-slp1

When declaring transliterations in HTML use the lang attribute. Examples:

 - <span lang="sa-Latn-x-iso">...</span>
 - <span lang="pi-Deva">...</span>
 - <span lang="x-slp1">...</span>

See also:

 - https://en.wikipedia.org/wiki/Devanagari_transliteration
 - https://tools.ietf.org/html/rfc5646#section-2.2.7
 - https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry

.. TODO: or should we use an alternative method using the *t* extension?
   Downside: the transliterations we use are not registered with IANA so the
   m0-tag would be invalid.  Compare this with the x-tag, which is supposed to
   be private use.

   - sa-Latn-t-sa-deva-m0-slp1
   - :RFC:`6497`
   - http://cldr.unicode.org/index/cldr-spec/transliteration-guidelines#Indic


.. _embed:

Embedded HTML
-------------

The client using the API may wish to display the HTML of the article embedded in
a page of the client's choice.  To make this seamless the HTML must be sanitized
by the client and the CSS needed for correct display of your HTML should be
provided by the :http:get:`/v1` endpoint.

Sanitized HTML in articles may contain only the tags: div, p, span, i, b, em,
strong, sup, sub, br, all with an optional class attribute.

Sanitized HTML in headwords may contain only the tags: i, sup, sub, without
attributes.  This is to allow the client to merge the headwords it got from
different dictionaries in a visually pleasing way.


Endpoints
=========

.. http:get:: /v1

   Get information about the dictionary.  Used during :ref:`client initialization<seq-init>`.

   **Example request**:

   .. sourcecode:: http

      GET /v1 HTTP/1.1
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
        "supported_langs_query": [
          "pi-Latn-x-iso"
        ]
      }

   :resheader Content-Type: application/json
   :statuscode 200: no error
   :resjsonobj string short_name: A siglum or short name of the dictionary.
                                  Max. 10 Unicode characters.
   :resjsonobj string name: A longer name of the dictionary.
                            Max. 80 Unicode characters.
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
   chosen transliteration to one accepted by the server.  The client MUST
   display an error message if unable to do so.  The client SHOULD use the
   user's chosen transliteration scheme if the server accepts it.


.. http:get:: /v1/headwords

   Get a list of headwords.  Used during :ref:`search<seq-search>`.

   **Example request**:

   .. sourcecode:: http

      GET /v1/headwords?q=ahimsa*&lang=x-slp1&limit=3 HTTP/1.1
      Host: api.cpd.uni-koeln.de

   **Example response**:

   .. sourcecode:: http

      HTTP/1.1 200 OK
      Content-Type: application/json

      {
        "data": [
          {
            "articles_url": "v1/articles/11411",
            "headwords_url": "v1/headwords/43681",
            "lang": "pi-Latn-x-iso",
            "normalized_text": "a-hi\u1e41sa",
            "text": "[a-hi\u1e41sa"
          },
          {
            "articles_url": "v1/articles/11412",
            "headwords_url": "v1/headwords/43685",
            "lang": "pi-Latn-x-iso",
            "normalized_text": "a-hi\u1e41sa",
            "text": "a-hi\u1e41sa"
          },
          {
            "articles_url": "v1/articles/11413",
            "headwords_url": "v1/headwords/43687",
            "lang": "pi-Latn-x-iso",
            "normalized_text": "a-hi\u1e41saka",
            "text": "a-hi\u1e41saka"
          }
        ],
        "limit": 3
      }

   :query q: The query. Restrict the result to headwords matching this query.
   :query fulltext: Full-text query. Restrict the result to headwords of articles
                    matching this text.
   :query lang: :ref:`transliteration <t13n>` scheme of the `q` and `fulltext`
                parameters. Default "x-iso".
   :query limit: limit number. Default 100.
   :query offset: offset number. Default 0.
   :resheader Content-Type: application/json
   :statuscode 200: no error
   :statuscode 400: Bad Request.  If the server does not support fulltext
                    searches.
   :resjsonobj string limit: The limit applied by the server to the number of
                             headwords returned.  This MUST NOT be higher but
                             MAY be lower than the limit requested in the query.
                             The limit actually used by the server MUST be
                             indicated in the response.
   :resjsonobj url articles_url: the article endpoint URL of the article relative to the API root.
   :resjsonobj url headwords_url: the headword endpoint URL relative to the API root.
   :resjsonobj string normalized_text: the headword as it would be sent in the
                                       `q` parameter.
   :resjsonobj string lang: The :ref:`transliteration <t13n>` applied to the
                            headword. Default "x-iso".
   :resjsonobj string text: the headword. :ref:`Some HTML <embed>` allowed.

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

   See also: the :http:get:`/v1` endpoint.


.. http:get:: /v1/headwords/(id)

   Get one headword.

   **Example request**:

   .. sourcecode:: http

      GET /v1/headwords/43704 HTTP/1.1
      Host: api.cpd.uni-koeln.de

   **Example response**:

   .. sourcecode:: http

      HTTP/1.1 200 OK
      Content-Type: application/json

      {
        "data": [
          {
            "articles_url": "v1/articles/11421",
            "headwords_url": "v1/headwords/43704",
            "lang": "pi-Latn-x-iso",
            "normalized_text": "a-hi\u1e41s\u0101",
            "text": "a-hi\u1e41s\u0101"
          }
        ],
        "limit": 100
      }

   :param id: The headword id. See: :http:get:`/v1/articles/(id)`.
   :resheader Content-Type: application/json
   :statuscode 200: no error
   :statuscode 404: headword not found

   For the response object parameters see: :http:get:`/v1/headwords`.


.. http:get:: /v1/headwords/(id)/context

   Get some headwords that alphabetically surround the article's headword.

   **Example request**:

   .. sourcecode:: http

      GET /v1/headwords/43704/context?limit=1 HTTP/1.1
      Host: api.cpd.uni-koeln.de

   **Example response**:

   .. sourcecode:: http

      HTTP/1.1 200 OK
      Content-Type: application/json

      {
        "data": [
          {
            "articles_url": "v1/articles/11420",
            "headwords_url": "v1/headwords/43700",
            "lang": "pi-Latn-x-iso",
            "normalized_text": "a-hi\u1e41sayat",
            "text": "a-hi\u1e41sayat"
          },
          {
            "articles_url": "v1/articles/11421",
            "headwords_url": "v1/headwords/43704",
            "lang": "pi-Latn-x-iso",
            "normalized_text": "a-hi\u1e41s\u0101",
            "text": "a-hi\u1e41s\u0101"
          },
          {
            "articles_url": "v1/articles/11437",
            "headwords_url": "v1/headwords/43733",
            "lang": "pi-Latn-x-iso",
            "normalized_text": "a-hita",
            "text": "a-hita"
          }
        ],
        "limit": 1
      }

   :param id: The article id. See: :http:get:`/v1/articles/(id)`.
   :query limit: limit number of returned headwords. The call returns limit
                 headwords before the headword, the headword, and limit
                 headwords after the headword, totaling (limit * 2 + 1)
                 headwords.  Default 100.
   :resheader Content-Type: application/json
   :statuscode 200: no error
   :statuscode 404: article not found

   For the response object parameters see: :http:get:`/v1/headwords`


.. http:get:: /v1/articles

   Get a list of articles.

   **Example request**:

   .. sourcecode:: http

      GET /v1/articles?offset=3&limit=3 HTTP/1.1
      Host: api.cpd.uni-koeln.de

   **Example response**:

   .. sourcecode:: http

      HTTP/1.1 200 OK
      Content-Type: application/json

      {
        "data": [
          {
            "articles_url": "v1/articles/4"
          },
          {
            "articles_url": "v1/articles/5"
          },
          {
            "articles_url": "v1/articles/6"
          }
        ],
        "limit": 3
      }

   :query limit: limit number. Default 100.
   :query offset: offset number. Default 0.
   :resheader Content-Type: application/json
   :statuscode 200: no error
   :statuscode 404: article not found
   :resjsonobj url articles_url: The endpoint URL of the article.



.. http:get:: /v1/articles/(id)

   Get the article.

   **Example request**:

   .. sourcecode:: http

      GET /v1/articles/42 HTTP/1.1
      Host: api.cpd.uni-koeln.de

   **Example response**:

   .. sourcecode:: http

      HTTP/1.1 200 OK
      Content-Type: application/json

      {
        "data": [
          {
            "articles_url": "v1/articles/42"
          }
        ],
        "limit": 100
      }

   :param id: The article id. Can be any string that is convenient to the server
              and does not contain URL special characters.
   :resheader Content-Type: application/json
   :statuscode 200: no error
   :statuscode 404: article not found
   :resjsonobj url articles_url: The endpoint URL of the article.

   Right now a quite pointless endpoint.  Included as placeholder for a later
   POST method, and for symmetry with :http:get:`/v1/headwords/(id)`.


.. http:get:: /v1/articles/(id)/formats

   Get a list of an article's available formats.  Used during :ref:`article retrieval<seq-article>`.

   **Example request**:

   .. sourcecode:: http

      GET /v1/articles/42/formats HTTP/1.1
      Host: api.cpd.uni-koeln.de

   **Example response**:

   .. sourcecode:: http

      HTTP/1.1 200 OK
      Content-Type: application/json

      [
        {
          "embeddable": true,
          "lang": "pi-Latn-x-iso",
          "mimetype": "text/x-html-literal",
          "text": "<div>...</div>"
        },
        {
          "canonical": true,
          "embeddable": true,
          "lang": "pi-Latn-x-iso",
          "mimetype": "text/html",
          "root" : "article",
          "urls": [
            "http://cpd.uni-koeln.de/search?article_id=42"
          ]
        }
        {
          "embeddable": true,
          "lang" : "pi-Deva",
          "mimetype" : "text/html",
          "root" : "article",
          "urls" : ["https://..."]
        },
        {
          "mimetype" : "application/xml+tei",
          "urls" : ["https://..."]
        },
        {
          "embeddable": true,
          "lang" : "pi-Deva",
          "mimetype" : "image/jpeg",
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
                            article. Default "x-iso".
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
   pointed to by `root`) is embeddable, eg. if the resource

     - contains only the article proper and
     - is self-contained HTML,

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


.. http:get:: /v1/articles/(id)/headwords

   Get a list of an article's headwords.

   **Example request**:

   .. sourcecode:: http

      GET /v1/articles/11412/headwords HTTP/1.1
      Host: api.cpd.uni-koeln.de

   **Example response**:

   .. sourcecode:: http

      HTTP/1.1 200 OK
      Content-Type: application/json

      {
        "data": [
          {
            "articles_url": "v1/articles/11412",
            "headwords_url": "v1/headwords/43685",
            "lang": "pi-Latn-x-iso",
            "normalized_text": "a-hi\u1e41sa",
            "text": "a-hi\u1e41sa"
          },
          {
            "articles_url": "v1/articles/11412",
            "headwords_url": "v1/headwords/43683",
            "lang": "pi-Latn-x-iso",
            "normalized_text": "a-hi\u1e41sat",
            "text": "a-hi\u1e41sat"
          }
        ],
        "limit": 100
      }

   :param id: The article id. See: :http:get:`/v1/articles/(id)`.
   :query limit: limit number. Default 100.
   :query offset: offset number. Default 0.
   :resheader Content-Type: application/json
   :statuscode 200: no error
   :statuscode 404: article not found

   For the response object parameters see: :http:get:`/v1/headwords`
