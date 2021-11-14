"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http = __importStar(require("http"));
const axios_1 = __importDefault(require("axios"));
const test_json_1 = __importDefault(require("./test.json"));
const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;
const authenticate = Buffer.from(process.env.USERNAME + ':' + process.env.PASSWORD).toString('base64');
function application(request, response) {
    const headers = request.headers.authorization;
    if (typeof headers === 'undefined') {
        response.writeHead(401, {
            'Content-Type': 'text/plain',
            'WWW-Authenticate': 'Basic realm="Discord Monitoring"'
        });
        response.end('Unauthorized');
        return;
    }
    ;
    const [, auth] = headers.split(' ');
    if (auth !== authenticate) {
        response.writeHead(401, {
            'Content-Type': 'text/plain',
            'WWW-Authenticate': 'Basic realm="Discord Monitoring"'
        });
        response.end('Unauthorized');
        return;
    }
    ;
    axios_1.default.post(`https://discord.com/api/webhooks/${process.env.WEBHOOK_ID}/${process.env.WEBHOOK_TOKEN}`, {
        content: test_json_1.default.incident.documentation.content,
        embeds: [
            {
                title: '[TEST] incident report (' + test_json_1.default.incident.resource_name + ')',
                type: 'rich',
                description: test_json_1.default.incident.summary,
                url: test_json_1.default.incident.url,
                color: 0xE12121,
                footer: {
                    text: 'Project ID : ' + test_json_1.default.incident.resource.labels.project_id
                },
                author: {
                    name: 'Resource : ' + test_json_1.default.incident.resource_display_name
                },
                fields: [
                    {
                        name: 'Monitoring version',
                        value: 'v' + test_json_1.default.version,
                        inline: true
                    },
                    {
                        name: 'Scoping project id',
                        value: test_json_1.default.incident.scoping_project_id,
                        inline: true
                    },
                    {
                        name: 'Incident timing',
                        value: (test_json_1.default.incident.ended_at - test_json_1.default.incident.started_at) / 60000 + ' min',
                        inline: true
                    },
                    {
                        name: 'Incident incident',
                        value: test_json_1.default.incident.state,
                        inline: true
                    },
                    {
                        name: 'Resource type',
                        value: test_json_1.default.incident.resource_type_display_name,
                        inline: true
                    },
                    {
                        name: 'Resource name',
                        value: test_json_1.default.incident.resource_name,
                        inline: true
                    }
                ]
            }
        ]
    })
        .then(() => {
        console.log('[REQUEST] Success');
    })
        .catch((error) => {
        console.log('[REQUEST] Error');
        console.error(error);
    });
}
;
const server = http.createServer(application);
server.listen(port);
server.on('listening', () => {
    console.log(`[SERVER - SERVER] Server is listening on port ${port}`);
});
server.on('connection', (socket) => {
    console.log('[CLIENT - SERVER] %s:%s connected', socket.remoteAddress, socket.remotePort);
});
