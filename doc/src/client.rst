===================
 M-SALT API Client
===================

A reference implementation of a client of the M-SALT API.


.. _seq-init:

Initialization
==============

The user navigates to the SALT-Portal and starts the client application.

The client initializes itself, gets a list of known active APIs, and calls the
:http:get:`/v1` endpoint of each known API to get the API status and further
information.

.. uml::
   :align: center
   :caption: Diagram of API calls for client initialization.

   participant User as u
   participant Client as c
   participant "API 1" as a1
   participant "API 2" as a2
   participant "API 3" as a3

   skinparam sequence {
	  LifeLineBackgroundColor LightGoldenRodYellow
   }

   u -> c: navigate
   activate c

   c -> c: GET list of\nknown APIs
   note over c: list contains:\nAPI 1, API 2, and API 3

   c -> a1: GET /v1
   activate a1
   c -> a2: GET /v1
   activate a2
   c -> a3: GET /v1
   activate a3

   note over a2
      responses are sent
      in arbitrary order
   end note

   a2 -> c: info
   deactivate a2
   c -> u: show info

   a3 -> c: info
   deactivate a3
   c -> u: show info

   a1 -> c: info
   deactivate a1
   c -> u: show info
   deactivate c


.. _seq-search:

Headword Search
===============

The client transliterates the user input into transliterations accepted by each
API and calls their :http:get:`/v1/headwords` endpoints. It then transliterates
the answers received and displays them to the user.  Transliteration occurs only
if necessary.

.. uml::
   :align: center
   :caption: Diagram of API calls for a headword search.

   participant User as u
   participant Client as c
   participant "API 1" as a1
   participant "API 2" as a2
   participant "API 3" as a3

   skinparam sequence {
	  LifeLineBackgroundColor LightGoldenRodYellow
   }

   u -> c: search\nheadword
   activate c
   ||20||
   hnote over c: transliterate (3x)
   ||20||
   c -> a1: GET /v1/headwords
   activate a1
   c -> a2: GET /v1/headwords
   activate a2
   c -> a3: GET /v1/headwords
   activate a3
   ||40||
   a1 -> c: headwords
   deactivate a1
   hnote over c: transliterate
   c -> u: show\nheadwords

   a3 -> c: headwords
   deactivate a3
   hnote over c: transliterate
   c -> u: show\nheadwords

   a2 -> c: headwords
   deactivate a2
   hnote over c: transliterate
   c -> u: show\nheadwords

   deactivate c


.. _seq-article:

Article Retrieval
=================

The client calls the :http:get:`/v1/articles/(id)/formats` endpoint, retrieves
the available formats from the API, and selects the most appropriate one.  It
then retrieves the article text (if not already embedded in the response) and
displays it to the user.  The client transliterates marked sections of the
article if necessary.  The client allows the user to page through articles
retrieved in multiple parts (eg. as a series of scans).

.. uml::
   :align: center
   :caption: Diagram of API calls for article retrieval.

   participant User as u
   participant Client as c
   participant "API" as a1

   skinparam sequence {
	  LifeLineBackgroundColor LightGoldenRodYellow
   }

   u -> c: select\narticle
   activate c

   c -> a1: GET /v1/articles/42/formats
   activate a1
   a1 -> c: formats
   deactivate a1
   ||20||
   hnote over c : decide best format
   ||20||
   loop eventually retrieve external urls
      c -> a1: GET external url
      activate a1
      a1 -> c: text or image
      deactivate a1
   end
   ||20||
   hnote over c: transliterate
   ||20||
   c -> u: show\narticle

   deactivate c
