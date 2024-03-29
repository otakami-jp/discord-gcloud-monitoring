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
const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;
const authenticate = Buffer.from(process.env.AUTH_USERNAME + ':' + process.env.AUTH_PASSWORD).toString('base64');
function application(request, response) {
    const authorization = request.headers.authorization;
    let data = '';
    function handlerData(chunk) {
        data += Buffer.from(chunk).toString('utf-8');
    }
    ;
    if (typeof authorization === 'undefined') {
        request.removeListener('data', handlerData);
        response.writeHead(401, {
            'Content-Type': 'text/plain',
            'WWW-Authenticate': 'Basic realm="Discord Monitoring"'
        });
        response.end('Unauthorized');
        return;
    }
    ;
    const [, auth] = authorization.split(' ');
    if (auth !== authenticate) {
        console.log('[SERVER] authentificate failed : %s', auth);
        request.removeListener('data', handlerData);
        response.writeHead(401, {
            'Content-Type': 'text/plain',
            'WWW-Authenticate': 'Basic realm="Discord Monitoring"'
        });
        response.end('Unauthorized');
        return;
    }
    ;
    request.once('end', () => {
        console.log('[SERVER] data raw receiving', data);
        let monitoring = JSON.parse(data);
        try {
            const webhookData = {
                embeds: [
                    {
                        title: 'Incident report (' + monitoring.incident.incident_id + ')',
                        type: 'rich',
                        description: monitoring.incident?.summary,
                        url: monitoring.incident?.url,
                        color: monitoring.version == 'test' ? 0xE1B621 : 0xE12121,
                    }
                ]
            };
            if (monitoring.incident?.documentation?.content) {
                webhookData.content = monitoring.incident.documentation.content;
            }
            ;
            if (monitoring.incident?.resource?.labels.project_id) {
                webhookData.embed.footer = {
                    text: 'Project ID : ' + monitoring.incident.resource.labels.project_id
                };
            }
            ;
            if (monitoring.incident?.resource_display_name) {
                webhookData.embed.author = {
                    name: 'Resource : ' + monitoring.incident?.resource_display_name
                };
            }
            ;
            const fields = [
                {
                    name: 'Monitoring version',
                    value: monitoring.version,
                    inline: true
                },
            ];
            if (monitoring.incident?.scoping_project_id) {
                fields.push({
                    name: 'Scoping project id',
                    value: monitoring.incident.scoping_project_id,
                    inline: true
                });
            }
            ;
            if (monitoring.incident?.ended_at && monitoring.incident?.started_at) {
                fields.push({
                    name: 'Incident timing',
                    value: (monitoring.incident.ended_at - monitoring.incident.started_at) / 60000 + ' min',
                    inline: true
                });
            }
            ;
            if (monitoring.incident?.state) {
                fields.push({
                    name: 'Incident incident',
                    value: monitoring.incident.state,
                    inline: true
                });
            }
            ;
            if (monitoring.incident?.resource_type_display_name) {
                fields.push({
                    name: 'Resource type',
                    value: monitoring.incident.resource_type_display_name,
                    inline: true
                });
            }
            ;
            if (monitoring.incident?.resource_name) {
                fields.push({
                    name: 'Resource name',
                    value: monitoring.incident.resource_name,
                    inline: true
                });
            }
            ;
            webhookData.embed.fields = fields;
            axios_1.default.post(`https://discord.com/api/webhooks/${process.env.WEBHOOK_ID}/${process.env.WEBHOOK_TOKEN}`, webhookData)
                .then(() => {
                console.log('[REQUEST] Success webhook');
                response.writeHead(204);
            })
                .catch((error) => {
                console.log('[REQUEST] Error webhook');
                console.error(error);
                response.writeHead(400);
            })
                .finally(() => {
                request.removeListener('data', handlerData);
                console.log('[REQUEST] Close connection');
                response.end();
            });
        }
        catch (err) {
            console.log('[SERVER] parsing error');
            console.error(err);
            axios_1.default
                .post(`https://discord.com/api/webhooks/${process.env.WEBHOOK_ID}/${process.env.WEBHOOK_TOKEN}`, {
                content: 'Error parsing data when received data from GCP monitoring',
                color: 0xE12121
            })
                .then(() => {
                console.log('[REQUEST] Success webhook');
                response.writeHead(204);
            })
                .catch((error) => {
                console.log('[REQUEST] Error webhook');
                console.error(error);
                response.writeHead(400);
            })
                .finally(() => {
                request.removeListener('data', handlerData);
                console.log('[REQUEST] Close connection');
                response.end();
            });
        }
        ;
    });
    request.on('data', handlerData);
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
