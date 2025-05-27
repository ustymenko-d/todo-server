<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

## Description

This is the backend server for a Todo application, built using:
<p> <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" /> <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" /> <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" /> <img src="https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socket.io&logoColor=white" /> <img src="https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white" /> </p>

The server provides a RESTful API for managing tasks, folders, and authentication.

## Live demo

https://uptodo-client.vercel.app

## Project setup

**1. Create a PostgreSQL database**


**2. Configure Prisma:** Update the DATABASE_URL in the .env file to match your PostgreSQL connection string.

**3. Generate Prisma Client**

```bash
$ npx prisma generate
```
**4. Run Migrations**

```bash
$ npx prisma migrate dev
```
**5. Start the server**

```bash
$ npm run start:dev
```
