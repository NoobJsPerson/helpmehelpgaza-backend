require('dotenv').config();
const express = require("express")
const app = express()
const bodyParser = require("body-parser")
const Sequelize = require("sequelize")
const sequelize = new Sequelize({
	dialect: 'sqlite',
	storage: 'database.sqlite',
	logging: false
})
const UnapprovedMessage = sequelize.define('unapproved_message', {
	text: {
		type: Sequelize.STRING,
		allowNull: false
	}
},
	{
		timestamps: false
	})
const MessageApproved = sequelize.define('message', {
	text: {
		type: Sequelize.STRING,
		allowNull: false
	}
},
	{
		timestamps: false
	})

sequelize.sync()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.get("/", (req, res) => {
	res.send("Hello")
})

app.post("/addmsg", async (req, res) => {
	const { text } = req.body
	console.log(text)
	const msg = await UnapprovedMessage.create({ text }).catch(err => {
		console.log(err)
		return res.json({ sentForApproval: false })
	})
	console.log(msg)
	res.json({ sentForApproval: true })
})
app.get("/get_unapproved_msgs", async (req, res) => {
	const messages = await UnapprovedMessage.findAll()
	res.json(messages)
})
app.get("/get_approved_msgs", async (req, res) => {
	const messages = await MessageApproved.findAll()
	res.json(messages)
})
app.post("/approvemsg", async (req, res) => {
	const { id, passwd } = req.body
	if (passwd !== process.env.SECRET_PASSWORD) {
		return res.json({ message: "Invalid password" })
	}
	const message = await UnapprovedMessage.findOne({ where: { id } })
	if (!message) {
		return res.json({ message: "Message not found" })
	}
	try {
		console.log(await UnapprovedMessage.destroy({ where: { id } }))
		await MessageApproved.create({ text: message.text })
		res.json({ message: "Message approved" })
	} catch (err) {
		console.log(err)
		res.json({ message: `Error: ${err.message}` })
	}
})
app.post("/deletemsg", async (req, res) => {
	const { id, passwd } = req.body
	if (passwd !== process.env.SECRET_PASSWORD) {
		return res.json({ message: "Invalid password" })
	}
	const message = await UnapprovedMessage.findOne({ where: { id } })
	if (!message) {
		return res.json({ message: "Message not found" })
	}
	try {
		console.log(await UnapprovedMessage.destroy({ where: { id } }))
		res.json({ message: "Message deleted" })
	} catch (err) {
		console.log(err)
		res.json({ message: `Error: ${err.message}` })
	}
})
app.listen(3000, () => {
	console.log("Server is running")
})