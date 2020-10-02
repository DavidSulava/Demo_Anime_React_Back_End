var express  = require('express');
var router   = express.Router();
var mongoose = require('mongoose');
require('dotenv').config();

const Anime_scm = require('../DB/models/anime.model');

/* GET home page. */
router.get('/media',  function(req, res, ){

  let query = {};
  let qOrder= {year:-1, rating: -1};

  let getRequest =  req.query.hasOwnProperty("page") && req.query.page > 0 ? req.query : {...req.query, page: 0  };
  // let getRequest =  req.query;


  let curentPage = (getRequest.page && getRequest.page > 1) ? getRequest.page : 0;
  let perPage    = 40;
  let skipPages  = curentPage * perPage;

  // if a request  is with parameters (prepare to filter data)
  if( Object.keys( getRequest ).length )
    {
      if(req.query.title)
          query.title = { $regex: '.*' + getRequest.title + '.*', $options: 'i' } ;

      if(req.query.Director)
          query.director = getRequest.Director;

      if (getRequest.Genre && !/all/i.test(getRequest.Genre) )
          query.genre = getRequest.Genre;

      if (getRequest.Year && !/all/i.test(getRequest.Year) )
          query.year = getRequest.Year;

      if (getRequest.Country && !/all/i.test(getRequest.Country) )
          query.country = getRequest.Country;

      if (getRequest.Type && !/all/i.test(getRequest.Type) )
          query.media_type = getRequest.Type;

      if (getRequest.Language && !/all/i.test(getRequest.Language) )
        {
          if(/Dubbed/i.test(getRequest.Language) )
            query.title = new RegExp(`.*dub`, "i");
          else
            query.title = {$not: /.*\(\s{0,}?Dub\s{0,}?\)/};

        }

      if (getRequest.Order && !/Default/i.test(getRequest.Order) )
        {
          qOrder = {};

          if (!/rating/i.test(getRequest.Order) )
            qOrder[getRequest.Order] = 1;
          else
            qOrder[getRequest.Order] = -1;

          if (/updatedAt/i.test(getRequest.Order) )
            qOrder[getRequest.Order] = -1;
        }
    }

  Anime_scm.find( query , 'title img imgU2 year media_type rating time' ,
  (err, docs) =>{
    if ( err ) throw err;
    Anime_scm.countDocuments(query, (er, count)=>{
      if ( er ) throw er;

      if (count > 0){

        let total = Math.floor(count/perPage);
        res.status(200).json( {
          data       : docs      ,
          page       : curentPage,
          totalPages : total     ,
          params     : getRequest
        } );
      }
      else{
        res.status(200).json( {
          data   : [],
          params : getRequest
        } );
      }
    } );

  } )
  .sort( qOrder )
  .skip(skipPages)
  .limit( perPage );

});

/* GET Filter data */
router.get('/filter', async function(req, res, ){
  Anime_scm.aggregate().facet({
    year   : [{$group:                {_id: null, years: { $addToSet: "$year" } } }],
    genre  : [{$unwind:"$genre"},     {$group: {_id: null, genre: { $addToSet: "$genre" } } }],
    country: [{$unwind:"$country"},   {$group: {_id: null, country: { $addToSet: "$country" } } }],
    type   : [{$unwind:"$media_type"},{$group: {_id: null, media_type: { $addToSet: "$media_type" }  } } ]
  })
  .exec((err, doc) =>{
    if (err) throw err;
    res.status(200).json( doc );
  });

});

//*Get movie record (to be done)
router.get('/find/:id', function(req, res, ){
  let id =  req.params.id;

  if ( id ){
    Anime_scm.findById( id , 'title year trailer start_year time status rating media_type imgU2 img genre episodes director description country',
    (err, docs) => { res.status(200).json( docs )} );
  }
});

//*Get Find All records ( Search functionality `)
router.get('/findAll', function(req, res, ){
  let title =  req.query.title;

  if( !title || !title.length >= 3)
    return res.status(200).send('The request must contain 3 or more characters');

  Anime_scm.find( {title: { $regex: title, $options: "i" } } , 'title img year media_type rating time' ,
  (err, docs) => { res.status(200).json( docs )} )
  .sort({year:-1})
  .limit(5);

});

//*Update Database
router.get('/update_db', async function(req, res){

  const fetch  = require('node-fetch');
  let response = await fetch( process.env.DB_UPDATE_SOURCE );

  if (!response.ok)
    res.send('no data');

  var data = await response.json();


  mongoose.connect( process.env.MONGO_ATLAS_STR, {useNewUrlParser: true, useUnifiedTopology: true})

  var db = mongoose.connection;

  db.on('error', console.error.bind(console, 'connection error:'));
  db.once('open', async function(){

    let manyErrors = [];
    let successes  = [];

    for (let item of data){

      let db_Anime = await Anime_scm.findOne({ title: item.title.trim(),  year: item.year });
      if( db_Anime && ( item.frame && item.frame.length ) )
        {

            let db_frameMap         = db_Anime.frame && ( db_Anime.frame.length ) ? db_Anime.frame.map( el => { return Object.keys( el )[0] }) : [];
            let item_frame_filtered = item.frame.filter( el => {  return db_frameMap.indexOf( Object.keys(el)[0] ) < 0 });

            if( item_frame_filtered.length )
              {

                if (db_Anime.frame)
                  db_Anime.frame.push( item_frame_filtered );
                else
                  db_Anime.frame = item_frame_filtered ;
                db_Anime.save( error => { if(error) { manyErrors.push( {Error:'Error: ' + error} ) }});

              }
        }
      else if( !db_Anime && item )
        {
          let genre     = item.genre.includes(',') ? item.genre.split(',') :  item.genre.length ? [item.genre] : [] ;
          item.genre    = genre ;

          let directors = item.director.includes(',') ? item.director.split(',') : item.director.length ? [item.director] : [] ;
          item.director = directors ;

          let country   = item.country.includes(',') ? item.country.split(',') : item.country.length ? [item.country] : [] ;
          item.country  = country ;


          let update_item  = {
            title           : item.title      ,
            year            : item.year       ,
            trailer         : item.trailer    ,
            time            : item.time       ,
            status          : item.status     ,
            start_year      : item.start_year ,
            rating          : item.rating     ,
            media_type      : item.media_type ,
            infoUrl         : item.infoUrl    ,
            imgU2           : item.imgU2      ,
            img             : item.img        ,
            genre           : item.genre      ,
            director        : item.director   ,
            episodes        : item.episodes   ,
            description     : item.description,
            country         : item.country    ,
            frame           : item.frame      ,
            serverReference : item.serverReference
          };

          let animeSchema = new Anime_scm(update_item);
          animeSchema.save()
          .then( ()=>{
            successes.push( { 200: `new title added : ${item.title}`} );
          } )
          .catch( err =>{
            manyErrors.push( {Error:'Error: '  + err} );
          } );

        }
    };

    if (manyErrors.length > 0)
      res.status(400).json(manyErrors);
    else
      res.status(200).json(successes);
  });
});



module.exports = router;
