const express = require('express');
const { MongoClient, Admin } = require('mongodb');
const uri = 'mongodb://localhost:27017/';
const mongoose = require('mongoose');
const cors = require('cors');

mongoose.connect('mongodb+srv://ismail:5Ha4KKb.FXCDVUU@cluster0.oqpdzm7.mongodb.net/myapp').then(() => {
  console.log('✅ MongoDB connected:', mongoose.connection.name);
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

const client = new MongoClient(uri);
const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

const loginSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true
    },
    password: {
      type: String,
      required: true
    },  
    budget: {
      type: Number,
      default: 10000
    },
    chosenOption: {
      type: String,
      enum: ['optionA', 'optionB', 'optionC', 'optionD', null],
      default: null
    },
    appliedMultiplier: {
      type: Number,
      default: null
    },
    history: [{
      crisisId: mongoose.Schema.Types.ObjectId,
      chosenOption: String,
      multiplier: Number,
      previousBudget: Number,
      newBudget: Number,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  },
  { collection: 'login' }
);
const Login = mongoose.model('Login', loginSchema);


const adminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true
    },
    password: {
      type: String,
      required: true
    }
    }, 
  { collection: 'admin' }
);
const admin = mongoose.model('admin', adminSchema);


const crisisSchema = new mongoose.Schema({
    time: {
        type: String,
        required: true
    },
    crisis: {
        type: String,
        required: true
    },
    options: {
        optionA: {
            text: {
                type: String,
                required: true
            },
            multiplier: {
                type: Number,
                required: true
            }
        },
        optionB: {
            text: {
                type: String,
                required: true
            },
            multiplier: {
                type: Number,
                required: true
            }
        },
        optionC: {
            text: {
                type: String,
                required: true
            },
            multiplier: {
                type: Number,
                required: true
            }
        },
        optionD: {
            text: {
                type: String,
                required: true
            },
            multiplier: {
                type: Number,
                required: true
            }
        }
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    active: {
        type: Boolean,
        default: true
    }
}, { collection: 'crisis' });

const Crisis = mongoose.model('Crisis', crisisSchema);

// ============================================
// TIMER MANAGEMENT
// ============================================
let timerState = {
    timeRemaining: 0,
    isRunning: false,
    crisisId: null
};

let timerInterval = null;

function parseTimeToSeconds(timeString) {
    const numMatch = timeString.match(/\d+/);
    const minutes = numMatch ? parseInt(numMatch[0]) : 0;
    return minutes * 60;
}

function startTimer(seconds, crisisId) {
    if (timerInterval) {
        clearInterval(timerInterval);
    }

    timerState = {
        timeRemaining: seconds,
        isRunning: true,
        crisisId: crisisId
    };

    console.log(`⏰ Timer started: ${seconds} seconds for crisis ${crisisId}`);

    timerInterval = setInterval(() => {
        if (timerState.timeRemaining > 0) {
            timerState.timeRemaining--;
        } else {
            clearInterval(timerInterval);
            timerState.isRunning = false;
            console.log('⏰ Timer ended!');
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    timerState.isRunning = false;
    timerState.timeRemaining = 0;
    timerState.crisisId = null;
    console.log('⏰ Timer stopped');
}

async function initializeTimer() {
    try {
        const activeCrisis = await Crisis.findOne({ active: true })
            .sort({ timestamp: -1 })
            .limit(1);

        if (activeCrisis) {
            const timeInSeconds = parseTimeToSeconds(activeCrisis.time);
            startTimer(timeInSeconds, activeCrisis._id);
            console.log('✅ Timer initialized from active crisis');
        }
    } catch (error) {
        console.error('Error initializing timer:', error);
    }
}

// ============================================
// API ROUTES
// ============================================

app.get('/login-info', async (req, res) => {
  try {
    const login = await Login.find({}).lean();
    res.json(login);
  } catch {
    res.status(500).send('Error fetching login info');
  }
});

app.get('/crisis/timer', (req, res) => {
    res.json({
        success: true,
        data: {
            timeRemaining: timerState.timeRemaining,
            isRunning: timerState.isRunning,
            crisisId: timerState.crisisId
        }
    });
});


app.get('/admin-login', async (req, res) => {
  try {
    const login = await admin.find({}).lean();
    res.json(login);
  } catch {
    res.status(500).send('Error fetching login info');
  }
});

app.post('/crisis/timer/start', async (req, res) => {
    try {
        const { crisisId, timeInMinutes } = req.body;

        let seconds;
        let crisis;

        if (crisisId) {
            crisis = await Crisis.findById(crisisId);
            if (!crisis) {
                return res.status(404).json({
                    success: false,
                    message: 'Crisis not found'
                });
            }
            seconds = parseTimeToSeconds(crisis.time);
        } else if (timeInMinutes) {
            seconds = timeInMinutes * 60;
        } else {
            return res.status(400).json({
                success: false,
                message: 'Either crisisId or timeInMinutes is required'
            });
        }

        startTimer(seconds, crisisId);

        res.json({
            success: true,
            message: 'Timer started',
            data: {
                timeRemaining: timerState.timeRemaining,
                isRunning: timerState.isRunning,
                crisisId: timerState.crisisId
            }
        });
    } catch (error) {
        console.error('Error starting timer:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

app.post('/crisis/timer/stop', (req, res) => {
    stopTimer();
    res.json({
        success: true,
        message: 'Timer stopped',
        data: timerState
    });
});

app.post('/crisis/timer/add', (req, res) => {
    const { seconds } = req.body;

    if (!seconds || typeof seconds !== 'number') {
        return res.status(400).json({
            success: false,
            message: 'seconds must be a number'
        });
    }

    timerState.timeRemaining += seconds;

    res.json({
        success: true,
        message: `Added ${seconds} seconds to timer`,
        data: {
            timeRemaining: timerState.timeRemaining,
            isRunning: timerState.isRunning
        }
    });
});

app.post('/apply-choice', async (req, res) => {
    try {
        const { userId, crisisId, chosenOption } = req.body;

        if (!userId || !crisisId || !chosenOption) {
            return res.status(400).json({ 
                success: false,
                message: 'Missing required fields: userId, crisisId, or chosenOption' 
            });
        }

        const validOptions = ['optionA', 'optionB', 'optionC', 'optionD'];
        if (!validOptions.includes(chosenOption)) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid option. Must be optionA, optionB, optionC, or optionD' 
            });
        }

        const user = await Login.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        const crisis = await Crisis.findById(crisisId);
        if (!crisis) {
            return res.status(404).json({ 
                success: false,
                message: 'Crisis not found' 
            });
        }

        const multiplier = crisis.options[chosenOption].multiplier;
        const previousBudget = user.budget;

        const newBudget = previousBudget * multiplier;

        user.budget = newBudget;
        user.chosenOption = chosenOption;
        user.appliedMultiplier = multiplier;

        user.history.push({
            crisisId: crisis._id,
            chosenOption: chosenOption,
            multiplier: multiplier,
            previousBudget: previousBudget,
            newBudget: newBudget,
            timestamp: new Date()
        });

        await user.save();

        res.json({ 
            success: true,
            message: 'Choice applied successfully',
            data: {
                username: user.username,
                previousBudget: previousBudget,
                multiplier: multiplier,
                newBudget: newBudget,
                chosenOption: chosenOption,
                optionText: crisis.options[chosenOption].text
            }
        });
    } catch (error) {
        console.error('Error applying choice:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: error.message 
        });
    }
});

app.get('/user/:userId', async (req, res) => {
    try {
        const user = await Login.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        res.json({ 
            success: true,
            data: {
                username: user.username,
                budget: user.budget,
                chosenOption: user.chosenOption,
                appliedMultiplier: user.appliedMultiplier,
                history: user.history
            }
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: error.message 
        });
    }
});

app.get('/user/username/:username', async (req, res) => {
    try {
        const user = await Login.findOne({ username: req.params.username });

        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        res.json({ 
            success: true,
            data: {
                username: user.username,
                budget: user.budget,
                chosenOption: user.chosenOption,
                appliedMultiplier: user.appliedMultiplier,
                history: user.history
            }
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: error.message 
        });
    }
});

app.post('/user/:username/reset', async (req, res) => {
    try {
        const user = await Login.findOne({ username: req.params.username });

        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        user.budget = 10000;
        user.chosenOption = null;
        user.appliedMultiplier = null;

        await user.save();

        res.json({ 
            success: true,
            message: 'Budget reset successfully',
            data: {
                username: user.username,
                budget: user.budget
            }
        });
    } catch (error) {
        console.error('Error resetting budget:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: error.message 
        });
    }
});

// DELETE - Delete all crises (for admin panel)
app.delete('/crisis', async (req, res) => {
    try {
        console.log('🗑️ Deleting all crises...');
        
        // Stop timer first
        stopTimer();

        // Delete all crisis documents
        const result = await Crisis.deleteMany({});

        console.log(`✅ Deleted ${result.deletedCount} crisis(es)`);

        res.json({ 
            success: true,
            message: 'All crisis updates deleted',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Error deleting all crises:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: error.message 
        });
    }
});

// POST - Create new crisis
app.post('/crisis', async (req, res) => {
    try {
        const { time, crisis, options, timestamp } = req.body;

        if (!time || !crisis || !options) {
            return res.status(400).json({ 
                success: false,
                message: 'Missing required fields: time, crisis, or options' 
            });
        }

        const requiredOptions = ['optionA', 'optionB', 'optionC', 'optionD'];
        for (const option of requiredOptions) {
            if (!options[option] || !options[option].text || options[option].multiplier === undefined) {
                return res.status(400).json({ 
                    success: false,
                    message: `${option} must have both text and multiplier` 
                });
            }
        }

        const newCrisis = new Crisis({
            time,
            crisis,
            options,
            timestamp: timestamp || new Date()
        });

        await newCrisis.save();
        console.log('✅ New crisis created:', newCrisis._id);

        // Start timer for this crisis
        const timeInSeconds = parseTimeToSeconds(time);
        startTimer(timeInSeconds, newCrisis._id);

        res.status(201).json({ 
            success: true,
            message: 'Crisis created successfully',
            data: newCrisis 
        });
    } catch (error) {
        console.error('Error creating crisis:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: error.message 
        });
    }
});

app.get('/crisis/latest', async (req, res) => {
    try {
        const latestCrisis = await Crisis.findOne({ active: true })
            .sort({ timestamp: -1 })
            .limit(1);

        if (!latestCrisis) {
            return res.status(404).json({ 
                success: false,
                message: 'No active crisis found' 
            });
        }

        res.json({ 
            success: true,
            data: latestCrisis 
        });
    } catch (error) {
        console.error('Error fetching latest crisis:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: error.message 
        });
    }
});

app.get('/crisis', async (req, res) => {
    try {
        const crises = await Crisis.find().sort({ timestamp: -1 });

        res.json({ 
            success: true,
            count: crises.length,
            data: crises 
        });
    } catch (error) {
        console.error('Error fetching crises:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: error.message 
        });
    }
});

app.get('/crisis/:id', async (req, res) => {
    try {
        const crisis = await Crisis.findById(req.params.id);

        if (!crisis) {
            return res.status(404).json({ 
                success: false,
                message: 'Crisis not found' 
            });
        }

        res.json({ 
            success: true,
            data: crisis 
        });
    } catch (error) {
        console.error('Error fetching crisis:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: error.message 
        });
    }
});

app.put('/crisis/:id', async (req, res) => {
    try {
        const { time, crisis, options } = req.body;

        const updatedCrisis = await Crisis.findByIdAndUpdate(
            req.params.id,
            { time, crisis, options },
            { new: true, runValidators: true }
        );

        if (!updatedCrisis) {
            return res.status(404).json({ 
                success: false,
                message: 'Crisis not found' 
            });
        }

        res.json({ 
            success: true,
            message: 'Crisis updated successfully',
            data: updatedCrisis 
        });
    } catch (error) {
        console.error('Error updating crisis:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: error.message 
        });
    }
});

// DELETE - Delete crisis by ID
app.delete('/crisis/:id', async (req, res) => {
    try {
        const deletedCrisis = await Crisis.findByIdAndDelete(req.params.id);

        if (!deletedCrisis) {
            return res.status(404).json({ 
                success: false,
                message: 'Crisis not found' 
            });
        }

        // Stop timer if this was the active crisis
        if (timerState.crisisId && timerState.crisisId.toString() === req.params.id) {
            stopTimer();
        }

        res.json({ 
            success: true,
            message: 'Crisis deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting crisis:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: error.message 
        });
    }
});

app.patch('/crisis/:id/toggle', async (req, res) => {
    try {
        const crisis = await Crisis.findById(req.params.id);

        if (!crisis) {
            return res.status(404).json({ 
                success: false,
                message: 'Crisis not found' 
            });
        }

        crisis.active = !crisis.active;
        await crisis.save();

        res.json({ 
            success: true,
            message: `Crisis ${crisis.active ? 'activated' : 'deactivated'}`,
            data: crisis 
        });
    } catch (error) {
        console.error('Error toggling crisis status:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: error.message 
        });
    }
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK',
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        timer: timerState
    });
});

app.listen(3000, async () => {
  console.log('Server is running on port 3000');
  await initializeTimer();
});

process.on('SIGINT', async () => {
    stopTimer();
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
});