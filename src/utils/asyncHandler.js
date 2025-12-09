//with promises
const asyncHandler = (requestHandler) => {
  (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };

// const asyncHandler = () =>{}
// const asyncHandler = (func) =>{()=>{}}
// const asyncHandler = (func) => async()=>{}

//with try catch

// const asyncHandler = (fn) => async(req,res,next) => {
//     try {
//         await fn(req,res,next);
//     } catch (err) {
//         res.status(err.code || 500).json({
//             sucess: false,
//             message: err.message || "Internal server error",
//         })
//     }
// }
