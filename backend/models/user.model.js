const mongoose= require('mongoose');
const bcrypt = require("bcryptjs");



const userSchema = new mongoose.Schema(
  {
    name      : {type : String, required: true, trim:true },
    email     : {type : String, required: true, trim:true },
    password  : {type : String, required: true, trim:true },
    img       : {type : String, default : '' },
    firstName : {type : String, default : '' },
    lastName  : {type : String, default : '' },
    phone     : {type : String, default : '' },
    isVerified: {type : Boolean, default : false },
    token     : {type : String, default : null },
    timeToken : {type : Number, default : null },

  },
  { timestamps: true } );

  userSchema.pre( 'save', function( next )
    {
        if ( !this.isModified('password') ) return next();

        const user = this;

        bcrypt.genSalt( 10, function( err, salt )
          {
              if ( err ){ return next( err ) }

              bcrypt.hash( user.password, salt, function( err, hash )
                {
                    if( err ){ return next( err ) }

                    user.password = hash;
                    next();
                })
          })
    } );

userSchema.methods.comparePassword  = function( str , callback )
  {
    return callback( null, bcrypt.compareSync( str, this.password ) );
  }

const User_scm =  mongoose.model( 'users', userSchema ) ;



module.exports = User_scm;