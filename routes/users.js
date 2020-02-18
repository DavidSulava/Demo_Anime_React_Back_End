var express = require('express');
var router  = express.Router();
const fetch = require('node-fetch');
const nodemailer = require("nodemailer");


const dotenv = require('dotenv').config();
const bcrypt = require("bcryptjs");

var mongoose  = require('mongoose');
const User_scm=require('../backend/models/user.model');
const userValidator = require( '../backend/validators/userValidator' )



const atlas         =  process.env.MONGO_ATLAS_STR;
const bd_update_src =  process.env.DB_UPDATE_SOURCE;

const badCredentials_m = "The User with such data does not exist";
const success          = "The credentials is correct, the access granted.";
const registered       = " has been registered.";
const userUpdated      = "The User data updated";
const emailConfEr      = 'Email verification timeout exceeded ! Please, login and verify your email agin in user settings';




var serverError = function( error, res, at_where = '' )
  {
    // .... to be improved.
    console.error( `-*-something went wrong at ${ at_where } -*-`, error );
    return res.status(500).json( { msg: { server_error: `something went wrong at ${ at_where }` } } );

  }

var recapCHA = async function ( respose_str )
  {
    var secretKey   = process.env.CAPCHA_SECRET_KEY;
    var responseKay = respose_str;
    var url         = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${responseKay}`;

    var response = await fetch( url, {  method: 'GET' } );

    if ( response.status == 200 )
      return response.json();
    else
      return false
  };

var userSessionHandle = ( req, res, user )=>
  {
    if ( !req.session[ 'user' ] )
          {
            req.session[ 'user' ] = {
              _id     : user._id,
              name    : user.name,
              email   : user.email,
              img     : user.img,
              firstName : user.firstName,
              lastName  : user.lastName,
              phone     : user.phone,
              isVerified: user.isVerified,
            };

            // req.fields.user = { name: user.name, email: user.email };

            // res.cookie('t_user', { name: user.name, email: user.email }, {signed: true} );
          }
    else
      {
        res.clearCookie('t_user')
      }

  }
var userObject = ( data )=>
  {
    var userPrepared = { name     : data.name,
                         email    : data.email,
                         firstName: data.firstName,
                         lastName : data.lastName,
                         phone    : data.phone,
                         img      : data.img,
                         isVerified: data.isVerified  };
    return userPrepared
  }

var sendEmail = async function ( From, ToEmail, subject, html )
  {
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport(
      {
        host: "smtp.gmail.com",
        port: 465, // 587, 465
        secure: true, // true for 465, false for other ports
        auth: {
          user: process.env.CONTACT_EMAIL,
          pass: process.env.CONTACT_EMAIL_PASSWORD,
        }
      });

    // send mail with defined transport object
    let info = await transporter.sendMail(
      {
        from   : `${From} <webproto3@gmail.com>`, // sender address
        to     : ToEmail, // list of receivers
        subject: subject, // Subject line
        html   : html // html body

      });

  }


/* Check if User exists in Session*/
router.get( '/checkUser',  async function( req, res, next )
  {

    if ( req.session[ 'user' ] )
      {
        var user = req.session[ 'user' ];

        return res.status(200).send( { user: { name     : user.name,
                                               email    : user.email,
                                               firstName: user.firstName,
                                               lastName : user.lastName,
                                               img      : user.img,
                                               phone    : user.phone,
                                               isVerified:user.isVerified  }  } );
      }
    else
      {
        return  res.status(401).send({ user: null })
      }

  });

/* Delete User Session*/
router.get( '/logOut',  async function( req, res, next )
  {

    if ( req.session[ 'user' ] )
      {
        req.session.destroy(  );
        res.clearCookie('connect.sid', { secure: false, httpOnly: true } );

        return res.status(200).send( { user: null  } );
      }
    else
      return res.status(401).send( { user: null  } );
  });

/* Register User*/
router.post( '/register',  async function( req, res, next )
  {
    var recaptcha    = req.fields['g-recaptcha-response'] ? req.fields['g-recaptcha-response'] : '';
    var captcha       = await recapCHA( recaptcha );

    if ( captcha.success )
      {
        var userName     = req.fields.name     ? req.fields.name     : '';
        var userEmail    = req.fields.email    ? req.fields.email    : '';
        var firstName    = req.fields.firstName? req.fields.firstName: '';
        var lastName     = req.fields.lastName ? req.fields.lastName : '';
        var phone        = req.fields.phone    ? req.fields.phone    : '';
        var userIMG      = req.fields.img      ? req.fields.img      : '';
        var userPassword = req.fields.password ? req.fields.password : '';
        var password_confirmation = req.fields.password_confirmation ? req.fields.password_confirmation : '';





        let validateMessage = userValidator( userName, userEmail, userPassword, password_confirmation );
        if ( validateMessage )
          return res.status(401).json( {msg: validateMessage } );



        var check = await User_scm.findOne( { email: userEmail } ).catch( error =>
          {
            return serverError( error, res, 'registering the user' )
          });

        if ( !check )
          {
            //  ---------- [ variables for email authentication ] -------------
            var hostName =  req.get('x-forwarded-host');
            var cTime    =  Date.now() + (1000 * 60 * 15);
            var hash     =  bcrypt.hashSync(`${ cTime }_${ userEmail }`, 8) ;
            var link     = `${hostName}/email/authentication/${userEmail}/${encodeURIComponent(hash)}`;



            var user = new User_scm( { name     : userName,
                                       email    : userEmail,
                                       password : userPassword,
                                       firstName: firstName,
                                       lastName : lastName,
                                       phone    : phone,
                                       img      : userIMG,
                                       token    : hash,
                                       timeToken: cTime } );


            let dataSaved =   await user.save();
            if( dataSaved )
              {
                // -----------[ Create Session ]--------------
                userSessionHandle( req, res, user );

                //  ---------- [ send email ] -------------
                var protocol = req.connection.encrypted ? 'https://' : 'http://';
                var html     = `<div><p>Please click the link below to confirm your email !</p> <a href='${protocol + link}'>Click Here</a></div>`;

                await sendEmail( hostName, userEmail, 'email confirmation', html ).catch(console.error);


                // --------- [ return Response] ---------------
                return res.status(200).json( { msg: { regSuccess: user.email + registered },
                                               user:  userObject( user ) });
              }
            else
              return serverError( dataSaved, res, 'registering the user' )

          }
        else
          return res.status(401).json( { msg: {errorCred: 'The user already exists. Please use  different email !'} } );
      }
    else
      return res.status(401).json( {  msg: {'erCaptcha': 'Check the box below  if you are not a robot'} } );

  } );

// Login User -- find the user by his id
router.post( '/login', async function( req, res )
  {
    var userName     = req.fields.name     ? req.fields.name     : '';
    var userEmail    = req.fields.email    ? req.fields.email    : '';
    var userPassword = req.fields.password ? req.fields.password : '';

    var check = await User_scm.findOne( { email: userEmail } ).catch( error => serverError( error,  'login the user' ) );

    if ( !check )
      return res.status(401).send( { msg:{errorCred: badCredentials_m } } );;

    check.comparePassword( userPassword , (err, callBack) =>
      {
        if ( err )
          serverError( err,  'at password comparison --at attempt to login' );

        if( !callBack )
          {
            return res.status(401).send( { msg:{errorCred: badCredentials_m } } );
          }

        userSessionHandle( req, res, check )


        return res.status(200).send( { msg: { loginSuccess: success}, user: {
                                                                  name : check.name,
                                                                  email: check.email,
                                                                  img  :check.img,
                                                                  firstName : check.firstName,
                                                                  lastName  : check.lastName,
                                                                  phone     : check.phone,
                                                                  isVerified: check.isVerified  }  } );

      })
  })

/* Update User*/
router.post( '/updateUser', async function( req, res )
  {

    if( req.session[ 'user' ] )
      {

        var userName        = req.fields.name        ? req.fields.name        : '';
        var userEmail       = req.fields.email       ? req.fields.email       : '';
        var firstName       = req.fields.firstName   ? req.fields.firstName   : '';
        var lastName        = req.fields.lastName    ? req.fields.lastName    : '';
        var phone           = req.fields.phone       ? req.fields.phone       : '';


        let validateMessage = userValidator( userName, userEmail  );
        if ( validateMessage )
          return res.status(401).send( {msg: validateMessage} );


        var id = req.session[ 'user' ]._id

        var check = await User_scm.findById( id ).catch( error => serverError( error, res,  'updating the user' ) );

        if ( !check )
          return res.status(400).send( { msg: { message: badCredentials_m } } );

        // -----------[ Check and Update Email ]--------------
        if ( userEmail && userEmail != check.email)
          {
            let checkEmail =  User_scm.find( { email: userEmail } )


            if( checkEmail )
              return res.status(401).send( { msg: { emailErr: 'A user with such email already exists!' } } );
            else
              {
                check.email      = userEmail;
                check.isVerified = false;
              }

          }


        if( userName )
          check.name = userName
        if( firstName )
          check.firstName = firstName
        if( lastName )
          check.lastName = lastName
        if( phone )
          check.phone = phone

        let dataSaved =   await check.save();
        if( dataSaved )
          {
            var updatedUser = { name     : check.name,
                                email    : check.email,
                                firstName: check.firstName,
                                img      : req.session[ 'user' ].img,
                                lastName : check.lastName,
                                phone    : check.phone,
                                isVerified:check.isVerified };
            // -----------[ Update Session Data ]--------------
            req.session[ 'user' ] = { ...req.session[ 'user' ], ...updatedUser}

            return res.status(200).send( { msg:{ userUpdated: userUpdated },  user: updatedUser  } );
          }

      }


  });

/* [ Change a User Image ]*/
router.post( '/updateImg', async function( req, res )
  {
    if( req.session[ 'user' ] )
      {
        var userIMG  = req.fields.img ? req.fields.img : '';

        if(userIMG)
          {
            var id = req.session[ 'user' ]._id

            var check = await User_scm.findById( id ).catch( error => serverError( error, res,  'updating the user' ) );

            if ( !check )
              return res.status(400).send( { msg: { message: badCredentials_m } } );

            check.img     = userIMG
            let dataSaved =   await check.save();

            if( dataSaved )
              {

                var updatedUser = { name     : check.name,
                                    email    : check.email,
                                    img      : check.img,
                                    firstName: check.firstName,
                                    lastName : check.lastName,
                                    phone    : check.phone,
                                    isVerified:check.isVerified };
                // -----------[ Update Session Data ]--------------
                req.session[ 'user' ] = { ...req.session[ 'user' ], ...updatedUser}

                return res.status(200).send( { msg:{ imgChanged: 'Avatar selected' },  user: updatedUser  } );
              }
          }
      }
  });
/* [ Change the Password ]*/
router.post( '/newPassword', async function( req, res )
{
  var oldUserPassword = req.fields.password    ? req.fields.password     : '';
  var newUserPassword = req.fields.new_assword ? req.fields.new_assword  : '';


  // -----------[ Change the Password ]---------------
  if( oldUserPassword && newUserPassword && req.session[ 'user' ]  )
    {
      var id = req.session[ 'user' ]._id;
      var check = await User_scm.findById( id ).catch( error => serverError( error, res,  'updating the user' ) );

      if ( !check )
        {
          return res.status(401).send( { msg :{ message: badCredentials_m } } );
        }


      check.comparePassword( oldUserPassword , async ( err, callBack ) =>
        {

          if ( err )
            return serverError( err,  `at password comparison --at updating the user: ${ check.email }` );

          if( !callBack )
            {
              return res.status(401).send( { msg:{ erPassword: 'Wrong Password'} } );
            }



          check.password = newUserPassword;


          var newPasSaved = await check.save()
          if( newPasSaved )
            return res.status(200).send( { msg:{passUpdated: 'Password changed successfully'}, user: check  } );
          else
            return serverError( newPasSaved,  'saving updated data of the user' );

        } );
    }
  else
    return res.status(401).send( { msg:{ erPassword: 'Please fill in all necessary  fields for password changing !' }  } );

})

/* Delete User*/
router.post( '/deleteUser', async function( req, res )
  {

    var userEmail    = req.fields.email    ? req.fields.email    : '';
    var userPassword = req.fields.password ? req.fields.password : '';



    if ( !req.session[ 'user' ]  )
      return res.status(400).send( { msg: { message: badCredentials_m } } );


    var validatePass = userValidator( '********', userEmail, userPassword, userPassword  );
    if ( validatePass )
      return res.status(401).send( { msg: validatePass} );

    var id = req.session[ 'user' ]._id || null;
    var check = await User_scm.findById( id ).catch( error => serverError( error,  'deleting the user' ) );

    if ( !check )
      res.status(401).send( { msg: { errorPassword: badCredentials_m } } );


    check.comparePassword( userPassword , (err, callBack) =>
        {
          if ( err )
            serverError( err,  `at password comparison --at deleting the user: ${ check.email }` );

          if( !callBack || (check.email != userEmail ) )
            {
                return res.status(401).send( { msg: { errorPassword: badCredentials_m } } );
            }

          var deletedUser = check.email;

          check.remove( function( err, check )
            {

              if ( err )
                return serverError( err,  `removing  the user: ${ check.email }` );

              if ( check.$isDeleted() )
                return res.status(200).send( { msg: { userDeleted: `User ${ deletedUser } has ben deleted.` } } );
              else
                return res.status(400).send( { msg: { message: `Something went wrong at deleting ${ deletedUser } ` } } );

            });



        } );

  } );

// send verification link from user settings
router.post( '/email/sendVerification', async function( req, res )
  {

    if( req.session[ 'user' ] )
      {
        var userEmail  = req.fields.email  ? req.fields.email  : '';

        // -----------[ Check and Update Email ]--------------
        if ( userEmail  )
          {
            var checkEmail = false
            if( userEmail != req.session[ 'user' ].email )
              checkEmail =  User_scm.find( { email: userEmail } )


            if( checkEmail )
              return res.status(401).send( { msg: { emailErr: 'A user with such email already exists!' } } );
            else
              {
                var check = await User_scm.findById( req.session[ 'user' ]._id  ).catch( error => serverError( error, res,  'updating the user' ) );

                var hostName =  req.get('x-forwarded-host');
                var cTime    =  Date.now() + (1000 * 60 * 15);
                var hash     =  bcrypt.hashSync(`${ cTime }_${ userEmail }`, 8) ;
                var link     = `${hostName}/email/authentication/${userEmail}/${encodeURIComponent(hash)}`;

                var protocol = req.connection.encrypted ? 'https://' : 'http://';
                var html     = `<div><p>Please click the link below to confirm your email !</p> <a href='${protocol + link}'>Click Here</a></div>`;

                // --- change data in database
                check.email      = userEmail;
                check.token      = hash;
                check.timeToken  = cTime;
                check.isVerified = false;

                let dataSaved =   await check.save();
                if( dataSaved )
                  {
                    //  ---------- [ send email confirmation link ] -------------
                    await sendEmail( hostName, userEmail, 'email confirmation', html ).catch(console.error);

                    var updatedUser = { name     : check.name,
                                        email    : check.email,
                                        firstName: check.firstName,
                                        img      : req.session[ 'user' ].img,
                                        lastName : check.lastName,
                                        phone    : check.phone,
                                        isVerified:check.isVerified };
                    // -----------[ Update Session Data ]--------------
                    req.session[ 'user' ] = { ...req.session[ 'user' ], ...updatedUser}

                    return res.status(200).send( { msg: { regSuccess: `Verification link has been sent to ${ check.email }` },  user: updatedUser  } );
                  }
              }

          }
      }
  })

/* Email Confirmation Check*/
router.post( '/email/confirmation',  async function( req, res, next )
  {
    var token  = req.fields.token     ? decodeURIComponent( req.fields.token ) : '';
    var email  = req.fields.email     ? req.fields.email                       : '';

    if ( email && token )
      {
        var check = await User_scm.findOne( { email: email } ).catch( error => serverError( error,  'login the user' ) );

        if ( !check )
          return res.status(401).send( { msg:{errorCred: badCredentials_m } } );

        if ( check.token == token && check.email == email )
          {
            var cTime    =  Date.now();

            if ( cTime <= check.timeToken )
              {
                check.isVerified = true;
                let dataSaved =   await check.save();

                if( dataSaved )
                  {
                    // -----------[ Create Session ]--------------
                    if ( !req.session[ 'user' ] )
                      userSessionHandle( req, res, check );
                    else
                      req.session[ 'user' ] = { ...req.session[ 'user' ], ...{ isVerified: check.isVerified }}

                    return res.status(200).send( {msg : { regSuccess: 'success' , emailConfirmed: 'email successfully confirmed !' },
                                                  user: userObject( check ) });
                  }

              }
            else
              return  res.status(401).send( { msg:{ timeErr: emailConfEr } } );

          }
        else
          {
            return  res.status(401).send( { msg:{ errorCred: badCredentials_m } } );
          }

      };


    return  res.status(401).send( { msg:{ errorCred: badCredentials_m } } );
  });

// Contact Email
router.post( '/contact/email',  async function( req, res, next )
  {

    var email  = req.fields.email     ? req.fields.email : '';
    var msg    = req.fields.msg       ? req.fields.msg   : '';
    var hostName =  req.get('x-forwarded-host');
    var html  = `<p>${msg}</p>`

    if ( email && msg )
      {
        await sendEmail( hostName, process.env.CONTACT_EMAIL, `${hostName} - ${email}` , html ).catch(console.error);

        return res.status(200).send( { msg: { contact: 'Your message has been sent. Thank you !' }  } );
      }
    else
      {
        return res.status(401).json( {msg: 'all fields has to be filled in' } );
      };

  });

module.exports = router;
