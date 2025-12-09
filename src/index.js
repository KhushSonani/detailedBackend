// require("dotenv").config({path:"./env"});

import dotenv from "dotenv"
import connectDB from "./db/index.js";

dotenv.config({
    path:"./env"
}); 

connectDB();


// import mongoose from "mongoose";
// import {DB_NAME} from './constants.js';
// Approach 1   
//ifi
/*
;(async ()=>{
    try{
        await mongoose.connect(`{process.env.MONGO_URI}/${DB_NAME}`);
    
        app.on("errror",(err)=>{
            console.error("Express app error:", err);
            throw err;
        });

        app.listen(process.env.PORT,()=>{
            console.log(`App is listening on port ${process.env.PORT}`);
        })

    }catch(err){
        console.error("Database connection error:", err);
        throw err;
    }
})()
*/
// Approach 2
