-- Create roles, databases, and schema privileges for all Cauppo services.
\set ON_ERROR_STOP on

DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cauppo_user') THEN
		CREATE ROLE cauppo_user LOGIN PASSWORD 'cauppo_user';
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cauppo_feedback') THEN
		CREATE ROLE cauppo_feedback LOGIN PASSWORD 'cauppo_feedback';
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cauppo_menu') THEN
		CREATE ROLE cauppo_menu LOGIN PASSWORD 'cauppo_menu';
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cauppo_order') THEN
		CREATE ROLE cauppo_order LOGIN PASSWORD 'cauppo_order';
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cauppo_analytics') THEN
		CREATE ROLE cauppo_analytics LOGIN PASSWORD 'cauppo_analytics';
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cauppo_notification') THEN
		CREATE ROLE cauppo_notification LOGIN PASSWORD 'cauppo_notification';
	END IF;
END
$$;

SELECT 'CREATE DATABASE zitadel'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'zitadel')\gexec

SELECT 'CREATE DATABASE cauppo_users OWNER cauppo_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cauppo_users')\gexec

SELECT 'CREATE DATABASE cauppo_feedback OWNER cauppo_feedback'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cauppo_feedback')\gexec

SELECT 'CREATE DATABASE cauppo_menu OWNER cauppo_menu'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cauppo_menu')\gexec

SELECT 'CREATE DATABASE cauppo_orders OWNER cauppo_order'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cauppo_orders')\gexec

SELECT 'CREATE DATABASE cauppo_analytics OWNER cauppo_analytics'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cauppo_analytics')\gexec

SELECT 'CREATE DATABASE cauppo_analytics_read OWNER cauppo_analytics'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cauppo_analytics_read')\gexec

SELECT 'CREATE DATABASE cauppo_users_test OWNER cauppo_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cauppo_users_test')\gexec

SELECT 'CREATE DATABASE cauppo_feedback_test OWNER cauppo_feedback'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cauppo_feedback_test')\gexec

SELECT 'CREATE DATABASE cauppo_menu_test OWNER cauppo_menu'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cauppo_menu_test')\gexec

SELECT 'CREATE DATABASE cauppo_orders_test OWNER cauppo_order'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cauppo_orders_test')\gexec

SELECT 'CREATE DATABASE cauppo_analytics_test OWNER cauppo_analytics'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cauppo_analytics_test')\gexec

SELECT 'CREATE DATABASE cauppo_analytics_read_test OWNER cauppo_analytics'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cauppo_analytics_read_test')\gexec

ALTER DATABASE cauppo_users OWNER TO cauppo_user;
GRANT ALL PRIVILEGES ON DATABASE cauppo_users TO cauppo_user;
ALTER DATABASE cauppo_feedback OWNER TO cauppo_feedback;
GRANT ALL PRIVILEGES ON DATABASE cauppo_feedback TO cauppo_feedback;
ALTER DATABASE cauppo_menu OWNER TO cauppo_menu;
GRANT ALL PRIVILEGES ON DATABASE cauppo_menu TO cauppo_menu;
ALTER DATABASE cauppo_orders OWNER TO cauppo_order;
GRANT ALL PRIVILEGES ON DATABASE cauppo_orders TO cauppo_order;
ALTER DATABASE cauppo_analytics OWNER TO cauppo_analytics;
GRANT ALL PRIVILEGES ON DATABASE cauppo_analytics TO cauppo_analytics;
ALTER DATABASE cauppo_analytics_read OWNER TO cauppo_analytics;
GRANT ALL PRIVILEGES ON DATABASE cauppo_analytics_read TO cauppo_analytics;

ALTER DATABASE cauppo_users_test OWNER TO cauppo_user;
GRANT ALL PRIVILEGES ON DATABASE cauppo_users_test TO cauppo_user;
ALTER DATABASE cauppo_feedback_test OWNER TO cauppo_feedback;
GRANT ALL PRIVILEGES ON DATABASE cauppo_feedback_test TO cauppo_feedback;
ALTER DATABASE cauppo_menu_test OWNER TO cauppo_menu;
GRANT ALL PRIVILEGES ON DATABASE cauppo_menu_test TO cauppo_menu;
ALTER DATABASE cauppo_orders_test OWNER TO cauppo_order;
GRANT ALL PRIVILEGES ON DATABASE cauppo_orders_test TO cauppo_order;
ALTER DATABASE cauppo_analytics_test OWNER TO cauppo_analytics;
GRANT ALL PRIVILEGES ON DATABASE cauppo_analytics_test TO cauppo_analytics;
ALTER DATABASE cauppo_analytics_read_test OWNER TO cauppo_analytics;
GRANT ALL PRIVILEGES ON DATABASE cauppo_analytics_read_test TO cauppo_analytics;

\connect cauppo_users
ALTER SCHEMA public OWNER TO cauppo_user;
GRANT ALL ON SCHEMA public TO cauppo_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cauppo_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cauppo_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO cauppo_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO cauppo_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO cauppo_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO cauppo_user;

\connect cauppo_feedback
ALTER SCHEMA public OWNER TO cauppo_feedback;
GRANT ALL ON SCHEMA public TO cauppo_feedback;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cauppo_feedback;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cauppo_feedback;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO cauppo_feedback;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO cauppo_feedback;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO cauppo_feedback;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO cauppo_feedback;

\connect cauppo_menu
ALTER SCHEMA public OWNER TO cauppo_menu;
GRANT ALL ON SCHEMA public TO cauppo_menu;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cauppo_menu;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cauppo_menu;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO cauppo_menu;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO cauppo_menu;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO cauppo_menu;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO cauppo_menu;

\connect cauppo_orders
ALTER SCHEMA public OWNER TO cauppo_order;
GRANT ALL ON SCHEMA public TO cauppo_order;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cauppo_order;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cauppo_order;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO cauppo_order;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO cauppo_order;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO cauppo_order;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO cauppo_order;

\connect cauppo_analytics
ALTER SCHEMA public OWNER TO cauppo_analytics;
GRANT ALL ON SCHEMA public TO cauppo_analytics;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cauppo_analytics;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cauppo_analytics;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO cauppo_analytics;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO cauppo_analytics;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO cauppo_analytics;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO cauppo_analytics;

\connect cauppo_analytics_read
ALTER SCHEMA public OWNER TO cauppo_analytics;
GRANT ALL ON SCHEMA public TO cauppo_analytics;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cauppo_analytics;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cauppo_analytics;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO cauppo_analytics;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO cauppo_analytics;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO cauppo_analytics;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO cauppo_analytics;

\connect cauppo_users_test
ALTER SCHEMA public OWNER TO cauppo_user;
GRANT ALL ON SCHEMA public TO cauppo_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cauppo_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cauppo_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO cauppo_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO cauppo_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO cauppo_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO cauppo_user;

\connect cauppo_feedback_test
ALTER SCHEMA public OWNER TO cauppo_feedback;
GRANT ALL ON SCHEMA public TO cauppo_feedback;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cauppo_feedback;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cauppo_feedback;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO cauppo_feedback;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO cauppo_feedback;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO cauppo_feedback;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO cauppo_feedback;

\connect cauppo_menu_test
ALTER SCHEMA public OWNER TO cauppo_menu;
GRANT ALL ON SCHEMA public TO cauppo_menu;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cauppo_menu;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cauppo_menu;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO cauppo_menu;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO cauppo_menu;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO cauppo_menu;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO cauppo_menu;

\connect cauppo_orders_test
ALTER SCHEMA public OWNER TO cauppo_order;
GRANT ALL ON SCHEMA public TO cauppo_order;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cauppo_order;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cauppo_order;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO cauppo_order;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO cauppo_order;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO cauppo_order;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO cauppo_order;

\connect cauppo_analytics_test
ALTER SCHEMA public OWNER TO cauppo_analytics;
GRANT ALL ON SCHEMA public TO cauppo_analytics;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cauppo_analytics;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cauppo_analytics;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO cauppo_analytics;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO cauppo_analytics;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO cauppo_analytics;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO cauppo_analytics;

\connect cauppo_analytics_read_test
ALTER SCHEMA public OWNER TO cauppo_analytics;
GRANT ALL ON SCHEMA public TO cauppo_analytics;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cauppo_analytics;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cauppo_analytics;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO cauppo_analytics;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO cauppo_analytics;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO cauppo_analytics;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO cauppo_analytics;

\connect postgres