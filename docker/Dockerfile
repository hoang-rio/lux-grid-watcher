FROM node:24.4.1-alpine AS fe_builder

COPY web_viewer/fe_src /fe_builder/fe_src

WORKDIR /fe_builder/fe_src
RUN yarn install
# Build the frontend
RUN yarn build

FROM python:3.12.10-alpine

COPY . /app
# Copy the requirements file
COPY .env.example /app/.env

WORKDIR /app
# Copy the frontend build from the builder stage
COPY --from=fe_builder /fe_builder/build /app/web_viewer/build

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt
# Expose the port the app runs on
EXPOSE 88

VOLUME [ "/app/.env", "/app/db/web.db" ]

CMD [ "python", "app.py" ]