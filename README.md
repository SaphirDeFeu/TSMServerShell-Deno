# TSM Server Shell
### A TSM Studios production
Minimalist server creation and management library

# Usage
### Create a server from the ServerShell and start listening :
```js
const app = new ServerShell()

app.listen()
```
You can use a specific configuration, using `Deno.ServeOptions` as a basis :
```js
const app = new ServerShell({
  port: 3000
})

app.listen()
```
### Bind routes to the server :
Use the public methods to add routes going to a specific path of your application, and bind them to a function that will run for all incoming requests going to that route.  
The `req` parameter represents the Request object, and the `info` parameter represents `Deno.ServeHandlerInfo`
```js
app.get("/get", (req, info) => {
  // Route callback
})

app.post("/post", (req, info) => {
  // Route callback
})
```
### Add middleware :
The middleware function will be called for every incoming requests
```js
app.use((req, info) => {
  // Middleware function
})
```
### Scan a directory for static assets :
```js
app.useStatic("./static/directory", "/route/root")
```