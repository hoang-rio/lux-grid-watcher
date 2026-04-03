FROM node:24.14.1-alpine AS fe_builder

COPY web_viewer/fe_src /fe_builder/fe_src

WORKDIR /fe_builder/fe_src
RUN yarn install
# Build the frontend
RUN yarn build

FROM python:3.13-alpine

COPY . /app

WORKDIR /app
# Copy the frontend build from the builder stage
COPY --from=fe_builder /fe_builder/build /app/web_viewer/build

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt
# Expose the ports the app runs on
EXPOSE 88
EXPOSE 8443

VOLUME [ "/app/.env", "/app/db/web.db", "/app/fcm_admin_key.json" ]

CMD [ "python", "app.py" ]
