import { ApolloServer, gql } from 'apollo-server';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from './models/user';
import Employee from './models/employee';


// generate token
const SECRET = 'mysecret';

function generateToken(id, email) {
  const token = jwt.sign({ id, email }, SECRET);
  return token;
}

function verifyToken(token) {
  try {
    const { id } = jwt.verify(token, SECRET);
    return id;
  } catch (err) {
    return null;
  }
}

const typeDefs = gql`
  input UserInput {
    email: String!
    password: String!
    userName: String
    position: String
    experience: String
  }
  type UserLogged {
    token: String
    email: String!
    userName: String
    position: String
    experience: String

  }
  type Employee {
    id : ID!
    firstName: String!
    lastName: String!
    projet: String!
    position: String
  }
  input EmployeeInput{
    id : ID
    firstName: String!
    lastName: String!
    projet: String!
    position: String
  }
  type Query {
    employees: [Employee]
    employee(id: ID!) : Employee
    me: UserLogged
  }
  type Mutation {
    register(input: UserInput): UserLogged
    login(input: UserInput): UserLogged
    addEmploye(input: EmployeeInput) : Employee
    updateEmploye(input: EmployeeInput): Employee
    removeEmploye(id: ID!,): Boolean
  }

`;

// Resolvers define the technique for fetching the types in the
// schema.  We'll retrieve books from the "books" array above.
const resolvers = {
  Query: {
    employees: async (_, $, { models }) => {
      const employee = await models.Employee.find();
      // console.log('employe', employee);
      await setTimeout(() => {
        // console.log('toto');
      }, 7000);
      return employee;
    },
    me: (_, $, { models, userId }) => models.User.findOne({ _id: userId }),
    employee: (_, { id }, { models }) => models.Employee.findOne({ _id: id }),
  },
  Mutation: {// User save as a model.user
    register: async (_, { input }, { models }) => {
      const hashPassword = await bcrypt.hash(input.password, 3);
      const user = new models.User({
        email: input.email,
        password: hashPassword,
        userName: input.userName,
        position: input.position,
        experience: input.experience,
      });
      await user.save();
      const token = generateToken(user.id, user.email);
      return { token, email: user.email, userName: user.userName, position: user.position, experience: user.experience };
    },
    login: async (_, { input }, { models }) => {
      // console.log(input);
      const currentUser = await models.User.findOne({ email: input.email });
      if (!currentUser) {
        throw new Error('User not found');
      }
      const correctPassword = await bcrypt.compare(input.password, currentUser.password);
      if (!correctPassword) {
        throw new Error('Wrong Password');
      }
      const token = generateToken(currentUser.id, currentUser.email);
      return { token, email: currentUser.email };
    },
    addEmploye: async (_, { input }, { models }) => {
      // console.log('input', input);
      const newUser = new models.Employee({
        firstName: input.firstName,
        lastName: input.lastName,
        projet: input.projet,
        position: input.position,
      });
      const UserAdded = await newUser.save();
      // console.log('UserAdded', UserAdded);
      return UserAdded;
    },
    updateEmploye: async (_,{input: { id, firstName, lastName, projet, position }}) => {
      console.log(id, firstName);
      const utilisateur = await Employee.findOneAndUpdate({ _id: id }, {
        $set: { firstName, lastName, projet, position } });
      console.log(utilisateur);
      return utilisateur;

    },
    removeEmploye: async (_, { id }) => {
      await Employee.findByIdAndRemove(id);
      return true;
    },

  },
};

// In the most basic sense, the ApolloServer can be started
// by passing type definitions (typeDefs) and the resolvers
// responsible for fetching the data for those types.
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    const userId = verifyToken(req.headers.authorization);
    return {
      userId,
      models: {
        User,
        Employee,
      },
    };
  },
});

// This `listen` method launches a web-server.  Existing apps
// can utilize middleware options, which we'll discuss later.
mongoose.connect('mongodb://localhost:27017/training', { useNewUrlParser: true })
  .then(() => {
    console.log('connected to mongodb');
    server.listen().then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
