import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
     },
     password: {
        type:String,
        required: true
     },
     name:{
        type: String,
        required: true
     },
     zernioProfileId:{
        type:String
     }

});

export default mongoose.model('User', UserSchema);