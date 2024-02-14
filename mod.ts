import { join } from "https://deno.land/std@0.215.0/path/mod.ts";

class RouteAlreadyBoundError extends Error {
  constructor(route: string) {
    super(`Route "${route}" is already bound.`);
    this.name = "RouteAlreadyBoundError";
  }
}

class Route {
  path: string;
  method: string;
  callback: (req: Request, info: Deno.ServeHandlerInfo) => Promise<ResponseConstructor>
  
  constructor(path: string, method: string, callback: (req: Request, info: Deno.ServeHandlerInfo) => Promise<ResponseConstructor>) {
    this.path = path;
    this.method = method;
    this.callback = callback;
  }

  equals(path: string, method: string): boolean {
    if(this.path == path && this.method == method) {
      return true;
    }
    return false;
  }
};

export interface ResponseConstructor {
  body?: BodyInit,
  init?: ResponseInit,
};

export default class ServerShell {
  private routes: Array<Route> = [];
  private middleware: (req: Request, info: Deno.ServeHandlerInfo) => void = () => {};
  private config: Deno.ServeOptions;
  
  /**
   * Creates an instance of ServerShell using the specified config. Config can be omitted, in which case the default config will be used.
   * @date 2/14/2024 - 7:23:47 PM
   *
   * @constructor
   * @param {Deno.ServeOptions} [config={hostname: 'localhost', port: 8000}] - By default, the server will start on localhost:8000
   */
  constructor(config: Deno.ServeOptions = {hostname: 'localhost', port: 8000}) {
    this.config = config;
  }

  /**
   * Starts the server on the specified config
   * @date 2/14/2024 - 7:14:42 PM
   * 
   * @param {() => void} [callback=() => {}] - Callback called upon the creation of the server
   * @returns {Deno.HttpServer} The server object used by Deno.serve()
   */
  listen(callback: () => void = () => {}): Deno.HttpServer {
    const server = Deno.serve(this.config, async (req: Request, info: Deno.ServeHandlerInfo) => {
      const pathname = new URL(req.url).pathname;
      const method = req.method.toUpperCase();
      this.middleware(req, info);
      let returnvalue: ResponseConstructor = {
        body: `Cannot ${method.toLowerCase()} ${pathname}`,
        init: {
          headers: {
            'Content-Type': 'text/html',
          },
          status: 404,
        }
      }

      for (const route of this.routes) {
        if(route.equals(pathname, method)) {
          returnvalue = await route.callback(req, info);
        }
      }

      return new Response(returnvalue.body, returnvalue.init);
    });

    callback();

    return server;
  }
  
  /**
   * Scans `staticDirectory` to listen for any incoming request to any of the static assets
   * @date 2/14/2024 - 7:38:18 PM
   *
   * @param {string} staticDirectory - The root directory of the static assets
   * @param {string} staticRoute - The route from which to start scanning. This is the equivalent of removing the `staticDirectory` folder from the resulting route
   */
  useStatic(staticDirectory: string, staticRoute: string) {
    for(const entry of Deno.readDirSync(staticDirectory)) {
      const pathnameDir = join(staticDirectory, entry.name);
      let pathnameRoute = join(staticRoute, entry.name);
      if(entry.isDirectory) {
        this.useStatic(pathnameDir, pathnameRoute);
      } else if(entry.isFile) {
        const contents = new TextDecoder('utf-8').decode(Deno.readFileSync(pathnameDir));
        const extension = entry.name.split('.')[1];
        const name = entry.name.split('.')[0];
        if(name == "index" && extension == "html") {
          pathnameRoute = join(pathnameRoute, '..');
        }
        this.get(pathnameRoute.replaceAll('\\', '/'), () => {
          return new Promise(resolve => {
            resolve({
              body: contents,
              init: {
                headers: {
                  'Content-Type': MIMEFromExt(extension),
                },
                status: 200,
              },
            });
          });
        });
      }
    }
  }

  /**
   * Sets up a middleware function to be run for each incoming request
   * @date 2/14/2024 - 7:27:36 PM
   *
   * @param {(req: Request, info: Deno.ServeHandlerInfo) => void} middleware - The middleware function
   */
  use(middleware: (req: Request, info: Deno.ServeHandlerInfo) => void) {
    this.middleware = middleware;
  }

  /**
   * Binds a new route at `path` to a GET listener
   * @date 2/14/2024 - 7:09:49 PM
   *
   * @param {string} path - The path at which the route will take effect. Must start with a `/`
   * @param {(req: Request, info: Deno.ServeHandlerInfo) => Promise<ResponseConstructor>} listener - The function that will be run when a request arrives at the specified route
   * @throws `RouteAlreadyBoundError` if the `path` at which we're binding the route is already bound to another route
   */
  get(path: string, listener: (req: Request, info: Deno.ServeHandlerInfo) => Promise<ResponseConstructor>) {
    this.routes.forEach((route) => {
      if(route.path == path) {
        throw new RouteAlreadyBoundError(path);
      }
    });
    this.routes.push(new Route(path, "GET", listener));
  }

  /**
   * Binds a new route at `path` to a POST listener
   * @date 2/14/2024 - 7:09:49 PM
   *
   * @param {string} path - The path at which the route will take effect. Must start with a `/`
   * @param {(req: Request, info: Deno.ServeHandlerInfo) => Promise<ResponseConstructor>} listener - The function that will be run when a request arrives at the specified route
   * @throws `RouteAlreadyBoundError` if the `path` at which we're binding the route is already bound to another route
   */
  post(path: string, listener: (req: Request, info: Deno.ServeHandlerInfo) => Promise<ResponseConstructor>) {
    this.routes.forEach((route) => {
      if(route.path == path) {
        throw new RouteAlreadyBoundError(path);
      }
    });
    this.routes.push(new Route(path, "POST", listener));
  }
}

function MIMEFromExt(extension: string): string {
  switch(extension) {
    // Common HTML document extensions
    case "html": case "htm": return 'text/html';
    case "css": return 'text/css';
    case "js": case "mjs": return 'text/javascript';
    case "php": return "application/x-httpd-php";
    // Media formats
    case "svg": return 'image/svg+xml';
    case "apng": return 'image/apng';
    case "gif": return 'image/gif';
    case "jpg": case "jpeg": return 'image/jpeg';
    case "ico": return 'image/vnd.microsoft.icon';
    // Data types
    case "json": return 'application/json';
    case "xml": return 'application/xml';
    case "zip": return 'application/zip';
    case "7z": return 'application/x-7z-compressed';
    case "rar": return 'application/vnd.rar';
    case "tar": return 'application/x-tar';
    case "gz": return 'application/gzip';
    // Fonts
    case "otf": return 'font/otf';
    case "ttf": return 'font/ttf';
    
    default: return 'text/plain';
  }
}