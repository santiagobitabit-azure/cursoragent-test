@description('Nombre base para los recursos (alfanumérico en minúsculas, sin espacios).')
param baseName string = 'mundial2026'

@description('Región de Azure donde se despliegan los recursos.')
param location string = resourceGroup().location

@secure()
@description('Secreto JWT para firmar tokens de sesión. Usá un valor largo y aleatorio.')
param jwtSecret string

@secure()
@description('Contraseña del administrador de PostgreSQL Flexible Server.')
param postgresAdminPassword string

@description('Usuario administrador de PostgreSQL.')
param postgresAdminUser string = 'mundialadmin'

@description('Imagen inicial del contenedor. Tras el primer CI/CD se reemplaza por la imagen del ACR.')
param containerImage string = 'mcr.microsoft.com/k8se/quickstart:latest'

@description('Número mínimo de réplicas.')
param minReplicas int = 1

@description('Número máximo de réplicas.')
param maxReplicas int = 2

var uniqueSuffix = uniqueString(resourceGroup().id)
var acrName = take('acr${replace(toLower(baseName), '-', '')}${uniqueSuffix}', 50)
var postgresServerName = take('psql${replace(toLower(baseName), '-', '')}${uniqueSuffix}', 63)
var postgresDbName = 'mundial'
var logAnalyticsName = 'log-${baseName}-${uniqueSuffix}'
var containerAppsEnvName = 'cae-${baseName}-${uniqueSuffix}'
var containerAppName = 'ca-${baseName}-${uniqueSuffix}'
var encodedPassword = uriComponent(postgresAdminPassword)

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource containerAppsEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: containerAppsEnvName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: postgresServerName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: postgresAdminUser
    administratorLoginPassword: postgresAdminPassword
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

resource postgresDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  parent: postgresServer
  name: postgresDbName
}

resource postgresFirewallAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-12-01-preview' = {
  parent: postgresServer
  name: 'AllowAllAzureIps'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
  }
}

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: containerAppName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
        allowInsecure: false
      }
      registries: [
        {
          server: acr.properties.loginServer
          identity: 'system'
        }
      ]
      secrets: [
        {
          name: 'jwt-secret'
          value: jwtSecret
        }
        {
          name: 'database-url'
          value: 'postgresql://${postgresAdminUser}:${encodedPassword}@${postgresServer.properties.fullyQualifiedDomainName}:5432/${postgresDbName}?sslmode=require'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'mundial-app'
          image: containerImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'PORT'
              value: '8080'
            }
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'JWT_SECRET'
              secretRef: 'jwt-secret'
            }
            {
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}

resource acrPullRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, containerApp.id, 'AcrPull')
  scope: acr
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
    principalId: containerApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

output containerAppName string = containerApp.name
output containerAppUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output acrName string = acr.name
output acrLoginServer string = acr.properties.loginServer
output postgresServerName string = postgresServer.name
output postgresFqdn string = postgresServer.properties.fullyQualifiedDomainName
output postgresDatabaseName string = postgresDatabase.name
output resourceGroupName string = resourceGroup().name
