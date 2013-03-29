Bot-o-matic (for the People)
=================

This [node](http://nodejs.org) application.

Currently used for Twitter bots:
[@GCatPix](http://twitter.com/gcatpix)
[@CWDogPix](http://twitter.com/cwdogpix)
[@Lyrpic](http://twitter.com/lyrpic)
[@ct_Races](http://twitter.com/ct_races)
[@xyisx_bot](http://twitter.com/xyisx_bot)


Phonemes for rhyming and syllable counting are taken from the CMU Pronouncing Dictionary, made avaiable as [node-cmudict](https://github.com/nathanielksmith/node-cmudict) by Nathaniel K Smith.

[express](https://github.com/visionmedia/express) is used as a placeholder server for fielding HTTP requests. (required by NodeJitsu)

SETUP
=================

To prep your node environment:

> npm install 

API credentials and bot configuration are set in `config.js`.


NOTE ON NODE-CMUDICT:
=================
Currently does NOT install to Win32/64 platforms via npm.
Pull request out to resolve this lack of support.
