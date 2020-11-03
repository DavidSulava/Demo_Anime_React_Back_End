const nodemailer = require("nodemailer");
const fetch      = require('node-fetch');

const serverError = function( error, res, at_where = '' ){
    // .... to be improved.
    console.error( `-*-something went wrong at ${ at_where } -*-`, error );
    return res.status(500).json( { msg: { server_error: `something went wrong at ${ at_where }` } } );

}

const recapCHA = async function ( respose_str ){
    var secretKey   = process.env.CAPCHA_SECRET_KEY;
    var responseKay = respose_str;
    var url         = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${responseKay}`;

    var response = await fetch( url, {  method: 'GET' } );

    if ( response.status != 200 )
        return { success: false }

    return response.json();
};

const userSessionHandle = ( req, res, user )=>{

    if ( !req.session[ 'user' ] ){

        req.session[ 'user' ] = {
        _id        : user._id       ,
        name       : user.name      ,
        email      : user.email     ,
        img        : user.img       ,
        firstName  : user.firstName ,
        lastName   : user.lastName  ,
        phone      : user.phone     ,
        isVerified : user.isVerified,
        };
    }
    else
        res.clearCookie('t_user')
}

const userObject = ( data )=>{
    return {
        name       : data.name     ,
        email      : data.email    ,
        firstName  : data.firstName,
        lastName   : data.lastName ,
        phone      : data.phone    ,
        img        : data.img      ,
        isVerified : data.isVerified
    };
}

const sendEmail = async function ( From, ToEmail, subject, html ){

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host   : "smtp.gmail.com",
        port   : 465             , // 587, 465
        secure : true            , // true for 465, false for other ports
        auth   : {
            user : process.env.CONTACT_EMAIL         ,
            pass : process.env.CONTACT_EMAIL_PASSWORD,
        }
    });

    // send mail with defined transport object
    await transporter.sendMail({
        from   : `${From} <webproto3@gmail.com>`, // sender address
        to     : ToEmail                        , // list of receivers
        subject: subject                        , // Subject line
        html   : html                             // html body

    });

}

module.exports = {
    userObject,
    sendEmail,
    serverError,
    recapCHA,
    userSessionHandle
}