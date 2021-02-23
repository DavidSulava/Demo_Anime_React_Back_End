var express  = require('express');
var router   = express.Router();

const data = require('../controllers/data.controller');

/* GET home page. */
router.get('/media',  data.main );

/* GET Filter data */
router.get('/filter', data.filter );

//*Get movie record
router.get('/find/:id', data.findByID );

//*Get Find All records ( Search functionality `)
router.get('/findAll', data.search );

//*Update Database
router.get('/update_db',  data.updateDatabase );



module.exports = router;
