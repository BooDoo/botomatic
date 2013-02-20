module.exports = {
  credentials: {
    gcatpix : 
    {
      service:              'twitter',
      consumer_key:         process.env['CAT_TWITTER_CONSUMER_KEY'],
      consumer_secret:      process.env['CAT_TWITTER_CONSUMER_SECRET'],
      access_token:         process.env['CAT_TWITTER_ACCESS_TOKEN'],
      access_token_secret:  process.env['CAT_TWITTER_ACCESS_TOKEN_SECRET']
    },
   
    cwdogpix:
    {
      service:              'twitter',
      consumer_key:         process.env['DOG_TWITTER_CONSUMER_KEY'],
      consumer_secret:      process.env['DOG_TWITTER_CONSUMER_SECRET'],
      access_token:         process.env['DOG_TWITTER_ACCESS_TOKEN'],
      access_token_secret:  process.env['DOG_TWITTER_ACCESS_TOKEN_SECRET']
    },
   
    flickr:
    {
      service:              'flickr',
      flickr_key:           process.env['GCATPIX_FLICKR_KEY'],
      flickr_secret:        process.env['GCATPIX_FLICKR_SECRET']
    }
  }
}