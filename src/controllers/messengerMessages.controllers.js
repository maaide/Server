import MessengerMessage from '../models/MessengerChat.js'
import axios from 'axios'

export const getMessengerIds = async (req, res) => {
    try {
        MessengerMessage.aggregate([
            {
                $sort: { messengerId: 1, _id: -1 }
            },
            {
                $group: {
                    _id: '$messengerId',
                    lastDocument: { $first: '$$ROOT' }
                }
            },
            {
                $replaceRoot: { newRoot: '$lastDocument' }
            },
            {
                $match: { agent: true }
            },
            {
                $sort: { createdAt: -1 }
            }
        ]).exec((err, result) => {
            if (err) {
                return res.sendStatus(404)
            }
            const filtered = result.map(({messengerId, adminView, createdAt}) => ({messengerId, adminView, createdAt}))
            return res.send(filtered)
        })
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getMessagesMessenger = async (req, res) => {
    try {
        const messages = await MessengerMessage.find({messengerId: req.params.id}).lean()
        res.send(messages)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const createMessage = async (req, res) => {
    try {
        await axios.post(`https://graph.facebook.com/v16.0/106714702292810/messages?access_token=${process.env.MESSENGER_TOKEN}`, {
            "recipient": {
                "id": req.body.sender
            },
            "messaging_type": "RESPONSE",
            "message": {
                "text": req.body.response
            }
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        })
        const newMessage = new MessengerMessage({messengerId: req.body.sender, response: req.body.response, agent: req.body.agent, view: false})
        await newMessage.save()
        return res.send(newMessage)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}