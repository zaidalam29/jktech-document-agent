import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../store/auth.context.jsx';
import { AppProvider } from '../store/app.context.jsx';
import ErrorBoundary from './ErrorBoundary';
import AppRouter from './Router';
import { BookProvider } from '../store/book.context.jsx';
import { DocumentProvider } from '../store/document.context.jsx';
import { IngestionProvider } from '../store/ingestion.context.jsx';
import { QAProvider } from '../store/qa.context.jsx';
import { AdminProvider } from '../store/admin.context.jsx';
import { RecommendationProvider } from '../store/recommendation.context.jsx';


// function App() {
//   return (
//     <ErrorBoundary>
//       <BrowserRouter>
//         <AppProvider>
//           <AuthProvider>
//             <BookProvider>
//               <DocumentProvider>
//                 <IngestionProvider>
//                   <QAProvider>

//                     <AdminProvider>
//                       <RecommendationProvider>
//                         <AppRouter />
//                       </RecommendationProvider>
//                     </AdminProvider>

//                   </QAProvider>
//                 </IngestionProvider>
//               </DocumentProvider>
//             </BookProvider>
//           </AuthProvider>
//         </AppProvider>
//       </BrowserRouter>
//     </ErrorBoundary>
//   );
// }

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <AuthProvider>
            <BookProvider>
              <RecommendationProvider>
                <DocumentProvider>
                  <IngestionProvider>
                    <QAProvider>
                      <AdminProvider>
                        <AppRouter />
                      </AdminProvider>
                    </QAProvider>
                  </IngestionProvider>
                </DocumentProvider>
              </RecommendationProvider>
            </BookProvider>
          </AuthProvider>
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;