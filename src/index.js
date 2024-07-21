// require('dotenv').config({path:'./env'})
import dotenv from 'dotenv'
import connectDB from "./db/configDB.js"
import { app } from './app.js';


dotenv.config({
    path:'./env'
})
connectDB()
.then(()=>{
    app.on('error',(err)=>{
        console.log("App Error :: ",err);
        throw err
    })
    app.listen(process.env.PORT || 8000,()=>{
        console.log('Server is running ');
    })
})
.catch((err)=>{
console.log('MongoDb connection Failed!! :: ',err)});