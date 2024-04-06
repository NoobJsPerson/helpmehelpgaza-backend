require('dotenv').config();
const express = require("express")
const app = express()
const bodyParser = require("body-parser")
const Sequelize = require("sequelize")
// const sequelize = new Sequelize({
// 	dialect: 'sqlite',
// 	storage: 'database.sqlite',
// 	logging: false
// })
const cyclicDB = require("@cyclic.sh/dynamodb")
const db = cyclicDB("puzzled-jersey-bearCyclicDB")

const UnapprovedMessage = db.collection("unapproved_messages")
const MessageApproved = db.collection("approved_messages")

async function main() {
	const UnapprovedMessageMaxID = await UnapprovedMessage.get("max_id")
	if (UnapprovedMessageMaxID === null) {
		await UnapprovedMessage.set("max_id", { id: 0 })
	}
	const MessageApprovedMaxID = await MessageApproved.get("max_id")
	if (MessageApprovedMaxID === null) {
		await MessageApproved.set("max_id", { id: 0 })
	}


	app.use(bodyParser.json())
	app.use(bodyParser.urlencoded({ extended: true }))
	app.use((req, res, next) => {
		res.header("Access-Control-Allow-Origin", "*")
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
		next()
	})

	app.get("/", (req, res) => {
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
		for (let i = 1; i <= max_id; i++) {
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
		for (let i = 1; i <= max_id; i++) {
			const message = await MessageApproved.get(i.toString())
			if (message) {
				messages.push({ id: i, text: message.text })
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
			const id = (await MessageApproved.get("max_id")).props.id
			await MessageApproved.set(id.toString(), { text: message.text })
			await MessageApproved.set("max_id", { id: id + 1 })
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
}
main()