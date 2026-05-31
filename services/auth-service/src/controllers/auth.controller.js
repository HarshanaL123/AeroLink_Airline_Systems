const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    // 1. Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email, password, firstName, and lastName',
      });
    }

    // 2. Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'A user with this email already exists',
      });
    }

    // 3. Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Create new user in DynamoDB
    const newUser = await User.create({
      userId: uuidv4(),
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      // Default to passenger if no role provided, or if they try to pass a bad role
      role: ['passenger', 'staff', 'admin'].includes(role) ? role : 'passenger',
    });

    // Remove passwordHash from response for security
    const { passwordHash: _, ...userResponse } = newUser;

    // 5. Send success response
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: userResponse,
    });
  } catch (error) {
    console.error('[REGISTER ERROR]', error);
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password',
      });
    }

    // 1. Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // 2. Check password matches
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // 3. Generate JWT Token
    const payload = {
      userId: user.userId,
      role: user.role,
      email: user.email,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    });

    // Remove password hash from user data
    const { passwordHash: _, ...userData } = user;

    res.status(200).json({
      success: true,
      token,
      data: userData,
    });
  } catch (error) {
    console.error('[LOGIN ERROR]', error);
    next(error);
  }
};
