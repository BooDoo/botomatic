Bot-o-matic (for the People)
=================

[node](http://nodejs.org) application to maintain menagerie of twitter bots.  
Includes basic status/management dashboard at `(host)/status/`

Currently used for Twitter bots:  
[@GCatPix](http://twitter.com/gcatpix)  
[@CWDogPix](http://twitter.com/cwdogpix)  
[@ct_Races](http://twitter.com/ct_races)  
[@xyisx_bot](http://twitter.com/xyisx_bot)  
[@LatourAndOrder](http://twitter.com/latourandorder)  
[@porpenteen](http://twitter.com/porpenteen)  
[@iLikeLikeiLike](http://twitter.com/ilikelikeilike)  

INSTALLATION
=================
> git clone https://github.com/BooDoo/botomatic.git  
> npm install

SETUP
=================
At the very least, you'll need [Twitter](http://developer.twitter.com) OAuth keys.  
If you're working with words, you'll also want an API key for [Wordnik](http://developer.wordnik.com).  
Any searching for photos will require [Flickr](http://developer.flickr.com) credentials.

See `config.js` for sample credential/bot configurations.

Current existing bot 'types' are:
 - `lyrpictweet` ([@GCatPix](http://twitter.com/gcatpix), [@CWDogPix](http://twitter.com/cwdogpix))  
    Fetch random lyrics (rap, country, or @lyricryptic) and a random photo (filtered by tag(s)), then tweet the result.  

 - `tweetmash` ([@porpenteen](http://twitter.com/porpenteen), based on [@LatourSwag](http://twitter.com/latourswag))  
    Search twitter using two separate criteria, combine one tweet from each around a "pivot" word, tweet the result.  

 - `latourandorder` ([@LatourAndOrder](http://twitter.com/latourandorder), variant of `tweetmash`) **SPECIALIZED**  
    Take a sentence from a TV series' IMDB episode summaries, pair it with a short tweet, tweet the result.  

 - `syllablecount` ([@ct_races](http://twitter.com/ct_races))  
    Find a tweet with the specified number of syllables, tweet its content with optional prefix/suffix content around it.  

 - `reminder` (based on [@AvoidComments](http://twitter.com/AvoidComments))  
    Given a pool of messages, periodically tweet them (in sequence or at random).  

 - `youtube` (based on [@420PR0GAMERXx](http://twitter.com/mlgpr0gamerxx))  
    Search YouTube videos for a phrase, tweet the video's title with a link to the video.  

 - `snowclone` ([@xyisx_bot](http://twitter.com/xyisx_bot), based on [@metaphorminute](http://twitter.com/metaphorminute), like a madlib)  
    Retrieve random words meeting certain criteria and use them to populate a template, tweet the result.  

 - `howilikeit` ([@iLikeLikeiLike](http://twitter.com/ilikelikeilike), variant of `snowclone`) **SPECIALIZED**  
    Get a random noun that has 3 or more plausible descriptors, fill out a template, tweet the result.

TODO:
=================
A lot, including:
 * Better error/exception handling
 * Generalizing from "bot types" to Source(s)->Filter(s)->Composition model
 * Simplifying bot config creation
 * More robust access/rights management for web dashboard
 * (De)activating bots individually via dashboard
 * Modification/injection of functions via dashboard?
 * Tests
 * Documentation

DATA SOURCES:
=================
 - CMU Pronouncing Dictionary (via Nathaniel K Smith's [node-cmudict](https://github.com/nathanielksmith/node-cmudict))
 - [Wordnik](http://wordnik.com)
 - [Original Hip-Hop Lyrics Archive](http://ohhla.com)
 - [Cowboy Lyrics](http://cowboylyrics.com)
 - [@lyricryptic](http://twitter.com/lyricryptic) (#thankUbasedBRENDAN)
 - [IMDB](http://imdb.com)
 - [Flickr](http://flickr.com)
 - [YouTube](http://youtube.com)

DEPENDENCIES / LIBRARIES:
=================
Back-end:
 - [twit](http://github.com/ttezel/twit) for interfacing with Twitter
 - [lodash](http://lodash.com) for general utility functions
 - [when](https://github.com/cujojs/when) for Defer/Promise functionality
 - [request](http://github.com/mikeal/request) for HTTP requests/REST calls

Web dashboard:
 - [express](http://github.com/visionmedia/express) server
 - [passport](http://github.com/jaredhanson/passport) authentication module
 - [Jade](http://github.com/visionmedia/jade) templating engine
 - [pure](http://pure.io) style library

NOTE ON NODE-CMUDICT:
=================
Currently does **not** install to Win32/64 platforms via npm.  
Resolved on github [repo](https://github.com/nathanielksmith/node-cmudict), awaiting push to npm package.
