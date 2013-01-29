Lyr+Pic=Tweet (lyrpictweet)
=================

This [node](http://nodejs.org) script extracts a random tweet-size lyric (preferably rhyming) from one of the specified songs on [ChartLyrics](http://chartlyrics.com), pairs it with a random image from [Flickr](http://flickr.com), and then tweets the result.

This was built atop [Darius Kazemi](http://twitter.com/tinysubversions)'s [Metaphor-a-Minute](https://github.com/dariusk/metaphor-a-minute).
Phonemes for rhyming are taken from the CMU Pronouncing Dictionary, made avaiable as [node-cmudict](https://github.com/nathanielksmith/node-cmudict) by Nathaniel K Smith.
[express](https://github.com/visionmedia/express) is used as a placeholder server for fielding HTTP requests.
[node-restclient](https://npmjs.org/package/node-restclient) is used for making calls to Flickr and YQL.

Other work by [Joel McCoy](http://twitter.com/boodooperson).

Currently this is used for Twitter bots [@GCatPix](http://twitter.com/gcatpix) and [@CWDogPix](http://twitter.com/cwdogpix).

SETUP
=================

To prep your node environment, run:

> npm install express

> npm install twit

> npm install node-restclient

> npm install cmudict


You'll also want to set environment variables for your API keys/secrets, &c.

NOTE ON NODE-CMUDICT:
=================
Currently does NOT install to Win32/64 platforms via npm.
Pull request out to resolve this lack of support.