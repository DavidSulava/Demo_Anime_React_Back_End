const mongoose= require('mongoose');



const animeSchema = new mongoose.Schema({
    country    : [],
    description: String,
    director   : [],
    episodes   : Number,
    frame      : [],
    genre      : [],
    img        : String,
    imgU2      : String,
    infoUrl    : String,
    media_type : String,
    rating     : Number,
    serverReference: [],
    start_year : Number,
    status     : String,
    time       : Number,
    title      : { type:String, required:true, trim:true },
    trailer    : String,
    year       : String,
  },
  { timestamps:true } );

  // const Anime_scm = mongoose.model('anime', animeSchema);
  const Anime_scm = mongoose.model( 'anime_db', animeSchema, 'anime');

module.exports = Anime_scm;