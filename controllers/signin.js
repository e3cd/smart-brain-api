const jwt = require('jsonwebtoken')

//setup redis
const redis = require('redis')
const redisClient = redis.createClient(process.env.REDIS_URI)

const handleSignin = (db, bcrypt, req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return Promise.reject('incorrect form submission');
  }
  //always return promise
  return db.select('email', 'hash').from('login')
    .where('email', '=', email)
    .then(data => {
      const isValid = bcrypt.compareSync(password, data[0].hash);
      if (isValid) {
        return db.select('*').from('users')
          .where('email', '=', email)
          .then(user => user[0])
          .catch(err => res.status(400).json('unable to get user'))
      } else {
        Promise.reject('wrong credentials')
      }
    })
    .catch(err => err)
}

//get token id from redis, check authenticity of user token, then make get request to profile
const getAuthTokenId = (req, res) => {
  const { authorization } = req.headers;
  return redisClient.get(authorization, (err, reply) => {
    if (err || !reply) {
      return res.status(400).json('Unauthorized');
    }
    return res.json({ id: reply })
  })
}

//create token
const signToken = (email) => {
  const jtwPayload = { email };
  return jwt.sign(jtwPayload, 'JWT_SECRET', { expiresIn: '2 days' })
}

//set token on redis
const setToken = (token, id) => {
  return Promise.resolve(redisClient.set(token, id))
}

const createSessions = user => {
  // generate and sign jwt token, return user data in token
  const { email, id } = user;
  const token = signToken(email)
  return setToken(token, id).then(() => {
    return {
      success: 'true',
      userId: id,
      token
    }
  })
    .catch(console.log)
}

//generate jwt after authentication
const signinAuthentication = (db, bcrypt) => (req, res) => {
  const { authorization } = req.headers;
  //if user is sends authorization token, get user id and send response back, otherwise handle signin and create session, create and store token in redis
  return authorization ? getAuthTokenId(req, res) : handleSignin(db, bcrypt, req, res)
    .then(data => {
      return data.id && data.email ? createSessions(data) : Promise.reject(data)
    })
    .then(session => res.json(session))
    .catch(err => res.status(400).json(err))
}



module.exports = {
  signinAuthentication,
  redisClient
}