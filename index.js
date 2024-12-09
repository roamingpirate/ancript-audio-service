import Bull from "bull";
import {createAudio} from './routes/audioRoute.js';
import { promisify } from "util";
import express from 'express';
import cors from 'cors'
import dotenv from 'dotenv';
dotenv.config();

const corsOptions = {
  origin: ['https://ancript.com', 'http://localhost:5173'], 
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, 
};

const app = express();
app.use(cors(corsOptions));
const redisOptions = {
  redis: { host: '10.161.9.27', port: 6379 },
};

const audioQueue = new Bull("audioQueue", {
    ...redisOptions,
    limiter: {
      max: 10,
      duration: 60000, 
    },
  });

audioQueue.process(async (job) => {
  try {
    console.log(`Processing audio with projectId: ${job.id}`);
    console.log("Creating Audio.");
    //await new Promise(resolve => setTimeout(resolve, 50000));
    const result = await createAudio(job.id)
    console.log(`Audio Created`);
    return result;

  } catch (err) {
    console.error(`Job failed: ${err.message}`);
    throw err; 
  }
});

app.post("/audio/create/:projectId", async (req, res) => {
  try {
    const projectId=req.params.projectId;
    const existingJob = await audioQueue.getJob(projectId);

    res.status(201).json({ message: "Audio job is being created", projectId: projectId });

    if (existingJob) {
        console.log(`Waiting for the job with projectId: ${projectId} to complete...`);
        await existingJob.finished();
        console.log("Job finished successfully")
        console.log(`Removing job with projectId: ${projectId}`);
        await existingJob.remove();
    }

    const job = await audioQueue.add({},{jobId:projectId});

  } catch (error) {
    console.error("Error adding job:", error);
    res.status(500).json({ error: "Failed to add job" });
  }
});

app.get("/audio/status/:projectId", async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const job = await audioQueue.getJob(projectId);

    if (!job) {
      return res.status(404).json({ message: "audio creation not started",status: -1 });
    }

    const state = await job.getState(); 

    if(state != 'completed')
    {
        return res.status(200).json({ message: "audio creation in progress",status: 0 })
    }

    res.status(200).json({status: 1,message: job.returnvalue});
  } catch (error) {
    console.error("Error fetching job status:", error);
    res.status(500).json({ error: "Failed to fetch job status" });
  }
});

app.listen(8080, async () => {
    console.log("Server Started");
});
