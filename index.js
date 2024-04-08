require('dotenv').config();
const express = require("express")
const app = express()
const bodyParser = require("body-parser")

const cyclicDB = require("@cyclic.sh/dynamodb")
const db = cyclicDB("puzzled-jersey-bearCyclicDB")

const UnapprovedMessage = db.collection("unapproved_messages")
const MessageApproved = db.collection("approved_messages")

UnapprovedMessage.get("max_id").then((max_id) => {
	if (max_id === null) {
		UnapprovedMessage.set("max_id", { id: 0 }).then(() => {
			console.log("max_id set")
		}).catch(console.eror)
	}
}).catch(console.error)

MessageApproved.get("max_id").then((max_id) => {
	if (max_id === null) {
		MessageApproved.set("max_id", { id: 0 }).then(() => {
			console.log("max_id set")
		}).catch(console.eror)
	}
}).catch(console.error)

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use((req, res, next) => {
	res.setHeader("Access-Control-Allow-Origin", "*")
	res.setHeader("Access-Control-Allow-Methods", "GET, POST")
	res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
	next()
})

app.get("/", (_req, res) => {
	res.send("Hello")
})

app.post("/addmsg", async (req, res) => {
	const { text } = req.body
	console.log(text)
	const id = (await UnapprovedMessage.get("max_id")).props.id
	await UnapprovedMessage.set(id.toString(), { text })
	await UnapprovedMessage.set("max_id", { id: id + 1 })
	res.status(200).json({ sentForApproval: true })
})
app.get("/get_unapproved_msgs", async (req, res) => {
	const messages = []
	const max_id = (await UnapprovedMessage.get("max_id")).props.id
	for (let i = 0; i < max_id; i++) {
		const message = await UnapprovedMessage.get(i.toString())
		console.log(message)
		if (message) {
			messages.push({ id: i, text: message.props.text })
		}
	}
	res.json(messages)
})
app.get("/get_approved_msgs", async (req, res) => {
	const messages = []
	const max_id = (await MessageApproved.get("max_id")).props.id
	for (let i = 0; i < max_id; i++) {
		const message = await MessageApproved.get(i.toString())
		if (message) {
			messages.push({ id: i, text: message.props.text })
		}
	}
	res.json(messages)
})
app.post("/approvemsg", async (req, res) => {
	const { id, passwd } = req.body
	if (passwd !== process.env.SECRET_PASSWORD) {
		return res.json({ message: "Invalid password" })
	}
	const message = await UnapprovedMessage.get(id.toString())
	if (!message) {
		return res.json({ message: "Message not found" })
	}
	try {
		console.log(await UnapprovedMessage.delete(id.toString()))
		await UnapprovedMessage.set("max_id", { id: (await UnapprovedMessage.get("max_id")).props.id - 1 })
		const approved_id = (await MessageApproved.get("max_id")).props.id
		await MessageApproved.set(approved_id.toString(), { text: message.props.text })
		await MessageApproved.set("max_id", { id: approved_id + 1 })
		res.json({ message: "Message approved" })
	} catch (err) {
		console.log(err)
		res.json({ message: `Error: ${err.message}` })
	}
})
app.post("/delete_unapproved_msg", async (req, res) => {
	const { id, passwd } = req.body
	if (passwd !== process.env.SECRET_PASSWORD) {
		return res.json({ message: "Invalid password" })
	}
	const message = await UnapprovedMessage.get(id.toString())
	if (!message) {
		return res.json({ message: "Message not found" })
	}
	try {
		console.log(await UnapprovedMessage.delete(id.toString()))
		await UnapprovedMessage.set("max_id", { id: (await UnapprovedMessage.get("max_id")).props.id - 1 })
		res.json({ message: "Message deleted" })
	} catch (err) {
		console.log(err)
		res.json({ message: `Error: ${err.message}` })
	}
})
app.post("/delete_approved_msg", async (req, res) => {
	const { id, passwd } = req.body
	if (passwd !== process.env.SECRET_PASSWORD) {
		return res.json({ message: "Invalid password" })
	}
	const message = await MessageApproved.get(id.toString())
	if (!message) {
		return res.json({ message: "Message not found" })
	}
	try {
		console.log(await MessageApproved.delete(id.toString()))
		await MessageApproved.set("max_id", { id: (await MessageApproved.get("max_id")).props.id - 1 })

		res.json({ message: "Message deleted" })
	} catch (err) {
		console.log(err)
		res.json({ message: `Error: ${err.message}` })
	}
})
app.listen(3000, () => {
	console.log("Server is running")
})
