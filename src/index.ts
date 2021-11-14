import * as http from 'http';
import * as net from 'net';
import axios from 'axios';

const port: number = process.env.PORT ? parseInt(process.env.PORT) : 8080;

function application(request: http.IncomingMessage, response: http.ServerResponse): void {
    const authenticate: string = Buffer.from(process.env.AUTH_USERNAME + ':' + process.env.AUTH_PASSWORD).toString('base64');
    const authorization: string | undefined = request.headers.authorization;
    let data: string = '';

    function handlerData(chunk: string): void {
        console.log(chunk);
        data += Buffer.from(chunk).toString('utf-8');
    };

    if (typeof authorization === 'undefined') {
        request.removeListener('data', handlerData);
        response.writeHead(401, {
            'Content-Type': 'text/plain',
            'WWW-Authenticate': 'Basic realm="Discord Monitoring"'
        });
        response.end('Unauthorized');
        return;
    };

    const [, auth] = (<string>authorization).split(' ');

    if (auth !== authenticate) {
        console.log('[SERVER] authentificate failed : %s', auth);
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
        try {
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
        } catch (err) {
            console.log('[SERVER] parsing error');
            console.error(err);
            axios
                .post(
                    `https://discord.com/api/webhooks/${process.env.WEBHOOK_ID}/${process.env.WEBHOOK_TOKEN}`,
                    {
                        content: 'Error parsing data when received data from GCP monitoring',
                        color: 0xE12121
                    }
                )
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
        };
    });

    request.on('data', handlerData);
};

const server: http.Server = http.createServer(application);

server.listen(port);

server.on('listening', () => {
    console.log(`[SERVER - SERVER] Server is listening on port ${port}`);
});

server.on('connection', (socket: net.Socket) => {
    console.log('[CLIENT - SERVER] %s:%s connected', socket.remoteAddress, socket.remotePort);
});