/**
 * Created by vadimsky on 06/12/16.
 */



export const doorkeeper = (req, res, next) =>{
  // console.log('LOGGED')
  console.log(req.url);
  next();
};
