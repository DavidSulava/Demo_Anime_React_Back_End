
var express  = require('express');
var router   = express.Router();

const data = require('../controllers/data.controller');

/* GET home page. */
router.get('/media',  data.main );

<<<<<<< HEAD
/* GET Filter data */
router.get('/filter', data.filter );

//*Get movie record
router.get('/find/:id', data.findByID );

//*Get Find All records ( Search functionality `)
router.get('/findAll', data.search );
=======
  let query  = {};
  let qOrder = { year: -1, rating: -1 };

  let getRequest = req.query.hasOwnProperty("page") && req.query.page > 0 ? req.query : { ...req.query, page: 0 };

  let curentPage = (getRequest.page && getRequest.page > 1) ? getRequest.page : 0;
  let perPage    = 40;
  let skipPages  = curentPage * perPage;

  // if a request  is with parameters (prepare to filter data)
  if (Object.keys(getRequest).length) {
    if (req.query.title)
      query.title = { $regex: '.*' + getRequest.title + '.*', $options: 'i' };

    if (req.query.Director)
      query.director = getRequest.Director;

    if (getRequest.Genre && !/all/i.test(getRequest.Genre))
      query.genre = getRequest.Genre;

    if (getRequest.Year && !/all/i.test(getRequest.Year))
      query.year = getRequest.Year;

    if (getRequest.Country && !/all/i.test(getRequest.Country))
      query.country = getRequest.Country;

    if (getRequest.Type && !/all/i.test(getRequest.Type))
      query.media_type = getRequest.Type;

    if (getRequest.Language && !/all/i.test(getRequest.Language)) {
      if (/Dubbed/i.test(getRequest.Language))
        query.title = new RegExp(`.*dub`, "i");
      else
        query.title = {
          $not: /.*\(\s{0,}?Dub\s{0,}?\)/
        };

    }

    if (getRequest.Order && !/Default/i.test(getRequest.Order)) {
      qOrder = {};

      if (!/rating/i.test(getRequest.Order))
        qOrder[getRequest.Order] = 1;
      else
        qOrder[getRequest.Order] = -1;

      if (/updatedAt/i.test(getRequest.Order))
        qOrder[getRequest.Order] = -1;
    }
  }

  Anime_scm.find(query, 'title img imgU2 year media_type rating time',
    (err, docs) => {
      if (err) throw err;

      Anime_scm.countDocuments(query, (er, count) => {
        if (er) throw er;

        if (count > 0) {

          let total = Math.floor(count / perPage);
          res.status(200).json({
            data       : docs,
            page       : curentPage,
            totalPages : total,
            params     : getRequest
          });
        } else {
          res.status(200).json({ data: [], params: getRequest });
        }
      });

    })
  .sort(qOrder)
  .skip(skipPages)
  .limit(perPage);

});

/* GET Filter form data */
router.get('/filter', async function (req, res) {

  Anime_scm.aggregate().facet({
    year: [{ $group: { _id: null ,years: {$addToSet: "$year" } } }],
    genre: [{ $unwind: "$genre"}, { $group: { _id: null, genre: { $addToSet: "$genre" } } }],
    country: [{ $unwind: "$country"}, { $group: { _id: null,country: { $addToSet: "$country"} } }],
    type: [{ $unwind: "$media_type" }, { $group: { _id: null, media_type: { $addToSet: "$media_type" } } }]
  })
  .exec((err, doc) => {
    if (err) throw err;

    res.status(200).json(doc);
  });

});

//*Get movie record (to be done)
router.get('/find/:id', function (req, res) {
  let id = req.params.id;

  if (id) {
    Anime_scm.findById(id, 'title year trailer start_year time status rating media_type imgU2 img genre episodes director description country',
      (err, docs) => { res.status(200).json(docs) });
  }

});

//*Get Find All records ( Search functionality `)
router.get('/findAll', function (req, res) {

  let title = req.query.title;

  if (title && title.length < 3)
    res.status(200).send('The request must contain 3 or more characters');


  Anime_scm.find({
    title: {
      $regex   : title,
      $options : "i"
    } }, 'title img year media_type rating time',
    (err, docs) => { if (!err) res.status(200).json(docs) }
  )
  .sort({year: -1})
  .limit(5);

});
>>>>>>> 8fd5a50 (some code formatting)

//*Update Database
router.get('/update_db',  data.updateDatabase );



module.exports = router;