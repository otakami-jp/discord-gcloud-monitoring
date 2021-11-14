import * as http from 'http';
import * as net from 'net';
import axios from 'axios';

const port: number = process.env.PORT ? parseInt(process.env.PORT) : 8080;
const authenticate: string = Buffer.from(process.env.USERNAME + ':' + process.env.PASSWORD).toString('base64');

function application(request: http.IncomingMessage, response: http.ServerResponse): void {
    const headers: string | undefined = request.headers.authorization;
    let data = '';

    function handlerData(chunk: string): void {
        data += chunk;
    }

    request.socket.on('data', handlerData);

    if (typeof headers === 'undefined') {
        request.removeListener('data', handlerData);
        response.writeHead(401, {
            'Content-Type': 'text/plain',
            'WWW-Authenticate': 'Basic realm="Discord Monitoring"'
        });
        response.end('Unauthorized');
        return;
    };

    const [, auth] = (<string>headers).split(' ');

    if (auth !== authenticate) {
        request.removeListener('data', handlerData);
        response.writeHead(401, {
            'Content-Type': 'text/plain',
            'WWW-Authenticate': 'Basic realm="Discord Monitoring"'
        });
        response.end('Unauthorized');
        return;
    };

    request.once('end', () => {
        let monitoring: {[key: string]: any} = JSON.parse(data);
        axios.post(
            `https://discord.com/api/webhooks/${process.env.WEBHOOK_ID}/${process.env.WEBHOOK_TOKEN}`,
            {
                content: monitoring.incident.documentation.content,
                embeds: [
                    {
                        title: 'Incident report (' + monitoring.incident.resource_name + ')',
                        type: 'rich',
                        description: monitoring.incident.summary,
                        url: monitoring.incident.url,
                        color: 0xE12121,
                        footer: {
                            text: 'Project ID : ' + monitoring.incident.resource.labels.project_id
                        },
                        author: {
                            name: 'Resource : ' + monitoring.incident.resource_display_name
                        },
                        fields: [
                            {
                                name: 'Monitoring version',
                                value: 'v' + monitoring.version,
                                inline: true
                            },
                            {
                                name: 'Scoping project id',
                                value: monitoring.incident.scoping_project_id,
                                inline: true
                            },
                            {
                                name: 'Incident timing',
                                value: (monitoring.incident.ended_at - monitoring.incident.started_at) / 60000 + ' min',
                                inline: true
                            },
                            {
                                name: 'Incident incident',
                                value: monitoring.incident.state,
                                inline: true
                            },
                            {
                                name: 'Resource type',
                                value: monitoring.incident.resource_type_display_name,
                                inline: true
                            },
                            {
                                name: 'Resource name',
                                value: monitoring.incident.resource_name,
                                inline: true
                            }
                        ]
                    }
                ]
            }
        )
            .then(() => {
                console.log('[REQUEST] Success');
            })
            .catch((error) => {
                console.log('[REQUEST] Error');
                console.error(error);
            })
            .finally(() => {
                request.removeListener('data', handlerData);

                response.writeHead(204);
                response.end();
            });
    });
};

const server: http.Server = http.createServer(application);

server.listen(port);

server.on('listening', () => {
    console.log(`[SERVER - SERVER] Server is listening on port ${port}`);
});

server.on('connection', (socket: net.Socket) => {
    console.log('[CLIENT - SERVER] %s:%s connected', socket.remoteAddress, socket.remotePort);
});