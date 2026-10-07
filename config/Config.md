
The below table defines the tech stack mapping to be followed for the CICS modernization into the target platform.
-------------------------------------------------------------------------------------------------
|Design Area      	| Source Technology     |  Target Technology                           |
-------------------------------------------------------------------------------------------------
Frotend/UI         	| CICS BMS screen       | React, Tailwind CSS,microanimation,Responsive UI
API Layer 	 	    | None 				    | REST APIs, API gateway
Backend 	 	    | COBOL 			    | .NET Core 9 (C#) with ASP.NET Core Web API
Database 	 	    | DB2 		 	 	    | Postgres 
Database 	 	    | VSAM (KSDS/ESDS/RRDS) | Postgres 
Security            | RACF                  | Oauth 2.0,HTTPS/TLS 1.3
State Management    | CICS COMMAREA / pseudo-conversational | Stateless REST + client-held state (or Redis-backed session if multi-step)
Temporary  storage 	| TSQ (Main/Aux)		| Redis
Temporary storage 	| TDQ (Intra-partition)	| Kafka / RabbitMQ
Temporary storage 	| TDQ (Extra-partition) | REST / Event / SFTP, per downstream system
Integration 		| Call Module, MQ, Connect Direct | Event streaming (Kafka, Azure Event Hub) or   messaging (RabbitMQ, IBM MQ, Azure Service Bus)
Architecture Type	| Transactional			| Microservice-based
Target Platform 	| Mainframe z/OS 		| Cloud or on-prem

Semantic Target Keys
---------------------------------------------------------------------------------
Use these stable keys in agent docs instead of repeating literal stack names.
The values are the current target mappings and can be updated in one place.
---------------------------------------------------------------------------------
| Key | Current Value |
| --- | --- |
| `target.ui.framework` | React |
| `target.ui.styling` | Tailwind CSS |
| `target.ui.motion` | microanimation |
| `target.ui.responsiveness` | Responsive UI |
| `target.api.layer` | REST APIs, API gateway |
| `target.backend.language` | .NET Core 9 (C#) |
| `target.backend.framework` | ASP.NET Core Web API |
| `target.database.engine` | Postgres |
| `target.security.auth.protocol` | Oauth 2.0 |
| `target.security.transport` | HTTPS/TLS 1.3 |
| `target.state.management` | Stateless REST + client-held state (or Redis-backed session if multi-step) |
| `target.cache.store` | Redis |
| `target.messaging.intra` | Kafka / RabbitMQ |
| `target.messaging.extra` | REST / Event / SFTP, per downstream system |
| `target.integration.messaging` | Event streaming (Kafka, Azure Event Hub) or messaging (RabbitMQ, IBM MQ, Azure Service Bus) |
| `target.architecture.type` | Microservice-based |
| `target.platform` | Cloud or on-prem |
| `target.backend.port` | 5000 |
| `target.frontend.port` | 5173 |
| `target.auth.provider.url` | http://localhost:8081 |
| `target.backend.baseUrl` | http://localhost:5000 |
| `target.frontend.proxyPath` | /api |
