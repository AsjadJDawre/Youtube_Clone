import { mongoose, Schema } from "mongoose";

const PlayListSchema = new Schema({
name:{
    type:String,
    required:true,

},
description : {
    type:String,
    required:true
}
,
video:{
    type:Schema.Types.ObjectId,
    ref:"Video"

},

tweet:{
    type:Schema.Types.ObjectId,
    ref:"Tweet"

},
owner : {
    type: Schema.Types.ObjectId,
    ref : "User"
}



},{timestamps:true})

export const PlayList= mongoose.model('PlayList','PlayListSchema')